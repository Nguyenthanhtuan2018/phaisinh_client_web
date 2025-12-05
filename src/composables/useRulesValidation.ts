import { ref, computed } from 'vue';
import type { WaveAnalysisResult, WaveRule, RuleValidationResult, RuleStep } from '@waves/shared';

export function useRulesValidation() {
  const currentRule = ref<WaveRule>('rule_10');
  const validationResult = ref<RuleValidationResult | null>(null);

  function validateRule10(result: WaveAnalysisResult): RuleValidationResult {
    const steps: RuleStep[] = [];
    const main = result.main;
    
    if (!main) {
      return { rule: 'rule_10', passed: false, steps: [{ name: 'No data', passed: false }] };
    }

    const { segments, directionMain } = main;

    // Step 1: BC > AB
    const step1 = {
      name: 'BC > AB',
      passed: (segments.BC ?? 0) > (segments.AB ?? 0),
      details: [`BC = ${segments.BC?.toFixed(2) ?? 'N/A'}`, `AB = ${segments.AB?.toFixed(2) ?? 'N/A'}`]
    };
    steps.push(step1);

    // Step 2: DE > CD
    const step2 = {
      name: 'DE > CD',
      passed: (segments.DE ?? 0) > (segments.CD ?? 0),
      details: [`DE = ${segments.DE?.toFixed(2) ?? 'N/A'}`, `CD = ${segments.CD?.toFixed(2) ?? 'N/A'}`]
    };
    steps.push(step2);

    // Step 3: FG > EF
    const step3 = {
      name: 'FG > EF',
      passed: (segments.FG ?? 0) > (segments.EF ?? 0),
      details: [`FG = ${segments.FG?.toFixed(2) ?? 'N/A'}`, `EF = ${segments.EF?.toFixed(2) ?? 'N/A'}`]
    };
    steps.push(step3);

    const passed = steps.every(s => s.passed);
    return { rule: 'rule_10', passed, steps };
  }

  function validateRule11(result: WaveAnalysisResult): RuleValidationResult {
    const steps: RuleStep[] = [];
    const main = result.main;
    
    if (!main) {
      return { rule: 'rule_11', passed: false, steps: [{ name: 'No data', passed: false }] };
    }

    const { segments } = main;

    // Step 1: BC > AB
    const step1 = {
      name: 'BC > AB',
      passed: (segments.BC ?? 0) > (segments.AB ?? 0),
      details: [`BC = ${segments.BC?.toFixed(2) ?? 'N/A'}`, `AB = ${segments.AB?.toFixed(2) ?? 'N/A'}`]
    };
    steps.push(step1);

    // Step 2: DE > BC
    const step2 = {
      name: 'DE > BC',
      passed: (segments.DE ?? 0) > (segments.BC ?? 0),
      details: [`DE = ${segments.DE?.toFixed(2) ?? 'N/A'}`, `BC = ${segments.BC?.toFixed(2) ?? 'N/A'}`]
    };
    steps.push(step2);

    // Step 3: FG > DE
    const step3 = {
      name: 'FG > DE',
      passed: (segments.FG ?? 0) > (segments.DE ?? 0),
      details: [`FG = ${segments.FG?.toFixed(2) ?? 'N/A'}`, `DE = ${segments.DE?.toFixed(2) ?? 'N/A'}`]
    };
    steps.push(step3);

    const passed = steps.every(s => s.passed);
    return { rule: 'rule_11', passed, steps };
  }

  function validateRule11Plus(result: WaveAnalysisResult): RuleValidationResult {
    const steps: RuleStep[] = [];
    const main = result.main;
    
    if (!main) {
      return { rule: 'rule_11_3nen', passed: false, steps: [{ name: 'No data', passed: false }] };
    }

    const { segments, points } = main;

    // Rule 11 base checks
    const step1 = {
      name: 'BC > AB',
      passed: (segments.BC ?? 0) > (segments.AB ?? 0),
      details: [`BC = ${segments.BC?.toFixed(2) ?? 'N/A'}`, `AB = ${segments.AB?.toFixed(2) ?? 'N/A'}`]
    };
    steps.push(step1);

    const step2 = {
      name: 'DE > BC',
      passed: (segments.DE ?? 0) > (segments.BC ?? 0),
      details: [`DE = ${segments.DE?.toFixed(2) ?? 'N/A'}`, `BC = ${segments.BC?.toFixed(2) ?? 'N/A'}`]
    };
    steps.push(step2);

    const step3 = {
      name: 'FG > DE',
      passed: (segments.FG ?? 0) > (segments.DE ?? 0),
      details: [`FG = ${segments.FG?.toFixed(2) ?? 'N/A'}`, `DE = ${segments.DE?.toFixed(2) ?? 'N/A'}`]
    };
    steps.push(step3);

    // Additional 3-candle check (simplified)
    const step4 = {
      name: '3 nến liên tiếp',
      passed: points.B !== null && points.C !== null && points.D !== null,
      details: ['Kiểm tra 3 nến liên tiếp trong pattern']
    };
    steps.push(step4);

    const passed = steps.every(s => s.passed);
    return { rule: 'rule_11_3nen', passed, steps };
  }

  function validate(result: WaveAnalysisResult | null) {
    if (!result) {
      validationResult.value = null;
      return;
    }

    switch (currentRule.value) {
      case 'rule_10':
        validationResult.value = validateRule10(result);
        break;
      case 'rule_11':
        validationResult.value = validateRule11(result);
        break;
      case 'rule_11_3nen':
        validationResult.value = validateRule11Plus(result);
        break;
    }
  }

  function setRule(rule: WaveRule) {
    currentRule.value = rule;
  }

  const statusText = computed(() => {
    if (!validationResult.value) return 'INDETERMINATE';
    return validationResult.value.passed ? 'VALID' : 'INVALID';
  });

  const statusClass = computed(() => {
    if (!validationResult.value) return 'pill-gray';
    return validationResult.value.passed ? 'pill-green' : 'pill-red';
  });

  return {
    currentRule,
    validationResult,
    validate,
    setRule,
    statusText,
    statusClass
  };
}
