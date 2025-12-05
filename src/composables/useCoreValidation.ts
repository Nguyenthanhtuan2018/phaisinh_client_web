// useCoreValidation.ts — Engine validate theo core.js
import { ref, computed } from 'vue';
import { CORE_RULES, type ValidationContext, type ValidationStatus, type PositionRelation, type RuleStep, type RuleSub, type RuleGroup } from '@/config/coreRules';
import type { WaveVariables } from './useWavesVariables';

export interface ValidationResult {
  passed: boolean;
  status: ValidationStatus;
  groupKey: string | null;
  subCode: string | null;
  stepIndex: number | null;
  failedPrerequisites: string[];
  failedConditions: string[];
  passedConditions: string[];
}

// Default window settings
const DEFAULT_DELTA_T = 600; // 600 giây = 10 phút
const DEFAULT_DELTA_B = 2;   // 2 giá

export function useCoreValidation() {
  const result = ref<ValidationResult | null>(null);
  const deltaT = ref(DEFAULT_DELTA_T);
  const deltaB = ref(DEFAULT_DELTA_B);

  // Tính vị trí E so với đường CG
  function calcPositionVsLine(
    pointY: number | null,
    lineP1: { x: number | null; y: number | null },
    lineP2: { x: number | null; y: number | null },
    pointX: number | null
  ): PositionRelation | null {
    if (pointY == null || pointX == null || lineP1.x == null || lineP1.y == null || lineP2.x == null || lineP2.y == null) {
      return null;
    }
    
    // Tính y trên đường thẳng tại x của point
    const slope = (lineP2.y - lineP1.y) / (lineP2.x - lineP1.x);
    const lineYAtPoint = lineP1.y + slope * (pointX - lineP1.x);
    
    const diff = pointY - lineYAtPoint;
    const tolerance = 0.001; // Tolerance cho "on"
    
    if (Math.abs(diff) < tolerance) return 'on';
    return diff > 0 ? 'above' : 'below';
  }

  // Build context từ WaveVariables
  function buildContext(vars: WaveVariables): ValidationContext {
    const { mains, segmentsMain, ratiosMain, deltasTMain } = vars;

    // Tính positions
    const E_vs_CG = calcPositionVsLine(
      mains.E?.y,
      mains.C,
      mains.G,
      mains.E?.x
    );

    const D_vs_BF = calcPositionVsLine(
      mains.D?.y,
      mains.B,
      mains.F,
      mains.D?.x
    );

    // Tính ranges (Tmin, Tmax, Pmin, Pmax từ B đến G)
    const times = [mains.B?.x, mains.C?.x, mains.D?.x, mains.E?.x, mains.F?.x, mains.G?.x].filter(t => t != null) as number[];
    const prices = [mains.B?.y, mains.C?.y, mains.D?.y, mains.E?.y, mains.F?.y, mains.G?.y].filter(p => p != null) as number[];

    return {
      mains,
      segmentsMain,
      ratiosMain,
      deltasTMain,
      positionsMain: {
        E_vs_CG,
        D_vs_BF
      },
      rangesMain: {
        Tmin: times.length > 0 ? Math.min(...times) : null,
        Tmax: times.length > 0 ? Math.max(...times) : null,
        Pmin: prices.length > 0 ? Math.min(...prices) : null,
        Pmax: prices.length > 0 ? Math.max(...prices) : null
      },
      deltaT: deltaT.value,
      deltaB: deltaB.value
    };
  }

  // Evaluate một expression string
  function evalExpression(expr: string, ctx: ValidationContext): boolean {
    try {
      // Tạo function với context
      const fn = new Function(
        'mains', 'segmentsMain', 'ratiosMain', 'deltasTMain', 
        'positionsMain', 'rangesMain', 'deltaT', 'deltaB',
        `return ${expr};`
      );
      return !!fn(
        ctx.mains, ctx.segmentsMain, ctx.ratiosMain, ctx.deltasTMain,
        ctx.positionsMain, ctx.rangesMain, ctx.deltaT, ctx.deltaB
      );
    } catch {
      return false;
    }
  }

  // Validate một condition (có thể là string hoặc array OR)
  function validateCondition(condition: string | string[], ctx: ValidationContext): boolean {
    if (Array.isArray(condition)) {
      // OR: chỉ cần 1 trong các điều kiện đúng
      return condition.some(c => evalExpression(c, ctx));
    }
    return evalExpression(condition, ctx);
  }

  // Validate tất cả conditions (AND)
  function validateAllConditions(conditions: (string | string[])[], ctx: ValidationContext): { passed: boolean; failed: string[]; passed_list: string[] } {
    const failed: string[] = [];
    const passed_list: string[] = [];

    for (const cond of conditions) {
      if (validateCondition(cond, ctx)) {
        passed_list.push(Array.isArray(cond) ? cond.join(' || ') : cond);
      } else {
        failed.push(Array.isArray(cond) ? cond.join(' || ') : cond);
      }
    }

    return { passed: failed.length === 0, failed, passed_list };
  }

  // Main validate function
  function validate(vars: WaveVariables): ValidationResult {
    const ctx = buildContext(vars);
    const failedPrerequisites: string[] = [];
    const failedConditions: string[] = [];
    const passedConditions: string[] = [];

    // Lần 1: Check prerequisites
    for (const prereq of CORE_RULES.prerequisites) {
      if (!evalExpression(prereq, ctx)) {
        failedPrerequisites.push(prereq);
      } else {
        passedConditions.push(`[prereq] ${prereq}`);
      }
    }

    if (failedPrerequisites.length > 0) {
      const res: ValidationResult = {
        passed: false,
        status: 'indeterminate',
        groupKey: null,
        subCode: null,
        stepIndex: null,
        failedPrerequisites,
        failedConditions: [],
        passedConditions
      };
      result.value = res;
      return res;
    }

    // Lần 2: Tìm group phù hợp
    let matchedGroup: RuleGroup | null = null;
    for (const group of CORE_RULES.groups) {
      const groupCheck = validateAllConditions(group.validate, ctx);
      if (groupCheck.passed) {
        matchedGroup = group;
        passedConditions.push(`[group:${group.key}] ${group.validate.join(' && ')}`);
        break;
      }
    }

    if (!matchedGroup) {
      const res: ValidationResult = {
        passed: false,
        status: 'indeterminate',
        groupKey: null,
        subCode: null,
        stepIndex: null,
        failedPrerequisites: [],
        failedConditions: ['No matching group'],
        passedConditions
      };
      result.value = res;
      return res;
    }

    // Lần 2b: Tìm sub phù hợp trong group
    let matchedSub: RuleSub | null = null;
    for (const sub of matchedGroup.subs) {
      const subCheck = validateAllConditions(sub.validate, ctx);
      if (subCheck.passed) {
        matchedSub = sub;
        passedConditions.push(`[sub:${sub.code}] ${sub.validate.join(' && ')}`);
        break;
      }
    }

    if (!matchedSub) {
      const res: ValidationResult = {
        passed: false,
        status: 'indeterminate',
        groupKey: matchedGroup.key,
        subCode: null,
        stepIndex: null,
        failedPrerequisites: [],
        failedConditions: ['No matching sub in group'],
        passedConditions
      };
      result.value = res;
      return res;
    }

    // Lần 3: Tìm step phù hợp (đầu tiên match)
    for (let i = 0; i < matchedSub.steps.length; i++) {
      const step = matchedSub.steps[i];
      const stepCheck = validateAllConditions(step.validate, ctx);
      
      if (stepCheck.passed) {
        passedConditions.push(...stepCheck.passed_list.map(c => `[step:${i}] ${c}`));
        
        const res: ValidationResult = {
          passed: true,
          status: step.status,
          groupKey: matchedGroup.key,
          subCode: matchedSub.code,
          stepIndex: i,
          failedPrerequisites: [],
          failedConditions: [],
          passedConditions
        };
        result.value = res;
        return res;
      } else {
        failedConditions.push(...stepCheck.failed.map(c => `[step:${i}] ${c}`));
      }
    }

    // Không match step nào
    const res: ValidationResult = {
      passed: false,
      status: 'indeterminate',
      groupKey: matchedGroup.key,
      subCode: matchedSub.code,
      stepIndex: null,
      failedPrerequisites: [],
      failedConditions,
      passedConditions
    };
    result.value = res;
    return res;
  }

  const statusText = computed(() => {
    if (!result.value) return 'CHƯA XÁC ĐỊNH';
    if (!result.value.passed) return 'KHÔNG ĐẠT';
    return result.value.status === 'continuation' ? 'TIẾP DIỄN' : 'ĐẢO CHIỀU';
  });

  const statusClass = computed(() => {
    if (!result.value || !result.value.passed) return 'pill-gray';
    return result.value.status === 'continuation' ? 'pill-green' : 'pill-red';
  });

  const groupInfo = computed(() => {
    if (!result.value) return '';
    const { groupKey, subCode } = result.value;
    if (!groupKey) return '';
    return subCode ? `${groupKey.toUpperCase()} - ${subCode}` : groupKey.toUpperCase();
  });

  function setDeltaT(value: number) {
    deltaT.value = value;
  }

  function setDeltaB(value: number) {
    deltaB.value = value;
  }

  function reset() {
    result.value = null;
  }

  return {
    result,
    deltaT,
    deltaB,
    validate,
    setDeltaT,
    setDeltaB,
    reset,
    statusText,
    statusClass,
    groupInfo
  };
}
