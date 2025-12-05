import { ref, computed } from 'vue';
import type { WaveAnalysisResult, WaveRule, RuleValidationResult, RuleStep } from '@/types';
import { waveProfiles } from '@/config/settings';

interface RatioRange {
  min: number;
  max: number;
}

export function useRulesValidation() {
  const currentRule = ref<WaveRule>('rule_10');
  const validationResult = ref<RuleValidationResult | null>(null);

  function pct(numer: number | undefined, denom: number | undefined): number | null {
    if (numer == null || denom == null || denom === 0) return null;
    return (numer / denom) * 100;
  }

  function checkRatio(value: number | null, range: RatioRange | undefined): { passed: boolean; value: number | null } {
    if (value == null || !range) return { passed: false, value: null };
    const rounded = Number(value.toFixed(2));
    const passed = rounded >= range.min && rounded <= range.max;
    return { passed, value: rounded };
  }

  function validateWithProfile(result: WaveAnalysisResult, rule: WaveRule): RuleValidationResult {
    const steps: RuleStep[] = [];
    const main = result.main;
    const profile = waveProfiles[rule];

    if (!main || !profile) {
      return { rule, passed: false, steps: [{ name: 'No data', passed: false }] };
    }

    const { segments } = main;

    // Calculate all ratios
    const ratios = {
      ratioBCOverAB: pct(segments.BC, segments.AB),
      ratioDEOverCD: pct(segments.DE, segments.CD),
      ratioFGOverEF: pct(segments.FG, segments.EF),
      ratioEFOverDE: pct(segments.EF, segments.DE),
      ratioCDOverBC: pct(segments.CD, segments.BC),
      ratioDEOverBC: pct(segments.DE, segments.BC),
      ratioFGOverDE: pct(segments.FG, segments.DE),
      ratioFGOverBC: pct(segments.FG, segments.BC)
    };

    // Check each ratio against profile
    const ratioKeys = Object.keys(profile) as Array<keyof typeof profile>;
    
    for (const key of ratioKeys) {
      const range = profile[key];
      const value = ratios[key as keyof typeof ratios];
      const check = checkRatio(value, range);
      
      const displayName = key
        .replace('ratio', '')
        .replace('Over', ' / ')
        .replace(/([A-Z])/g, ' $1')
        .trim();

      steps.push({
        name: displayName,
        passed: check.passed,
        details: [
          `Value: ${check.value?.toFixed(2) ?? 'N/A'}%`,
          `Range: ${range.min} - ${range.max}%`
        ]
      });
    }

    const passed = steps.every(s => s.passed);
    return { rule, passed, steps };
  }

  function validate(result: WaveAnalysisResult | null) {
    if (!result) {
      validationResult.value = null;
      return;
    }

    validationResult.value = validateWithProfile(result, currentRule.value);
  }

  function setRule(rule: WaveRule) {
    currentRule.value = rule;
  }

  const statusText = computed(() => {
    if (!validationResult.value) return 'INDETERMINATE';
    return validationResult.value.passed ? 'ĐẠT' : 'KHÔNG ĐẠT';
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
