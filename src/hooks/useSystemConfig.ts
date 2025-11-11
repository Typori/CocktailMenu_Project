import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { SystemConfigType } from '@/types';

interface ConfigOption {
  value: string;
  label: string;
  labelEn?: string;
}

/**
 * Hook: 获取系统配置选项
 */
export function useSystemConfigOptions(configType: SystemConfigType): ConfigOption[] | undefined {
  return useLiveQuery(
    () =>
      db.systemConfigs
        .where('configType')
        .equals(configType)
        .and((config) => config.isActive === true)
        .sortBy('displayOrder')
        .then((configs) =>
          configs.map((c) => ({
            value: c.value,
            label: c.label,
            labelEn: c.labelEn,
          }))
        ),
    [configType]
  );
}

/**
 * Hook: 获取所有系统配置类型的选项
 */
export function useAllSystemConfigOptions() {
  const spiritTypes = useSystemConfigOptions('spiritType');
  const units = useSystemConfigOptions('unit');
  const flavorTags = useSystemConfigOptions('flavorTag');
  const drinkDurations = useSystemConfigOptions('drinkDuration');
  const glassTypes = useSystemConfigOptions('glassType');
  const techniques = useSystemConfigOptions('technique');

  return {
    spiritTypes,
    units,
    flavorTags,
    drinkDurations,
    glassTypes,
    techniques,
  };
}

/**
 * Hook: 获取配置标签映射（用于快速查找）
 */
export function useConfigLabelMap(configType: SystemConfigType): Map<string, string> | undefined {
  return useLiveQuery(
    () =>
      db.systemConfigs
        .where('configType')
        .equals(configType)
        .and((config) => config.isActive === true)
        .toArray()
        .then((configs) => {
          const map = new Map<string, string>();
          configs.forEach((c) => map.set(c.value, c.label));
          return map;
        }),
    [configType]
  );
}

/**
 * Hook: 获取所有配置类型的标签映射
 */
export function useAllConfigLabelMaps() {
  const spiritTypeMap = useConfigLabelMap('spiritType');
  const unitMap = useConfigLabelMap('unit');
  const flavorTagMap = useConfigLabelMap('flavorTag');
  const drinkDurationMap = useConfigLabelMap('drinkDuration');
  const glassTypeMap = useConfigLabelMap('glassType');
  const techniqueMap = useConfigLabelMap('technique');

  return {
    spiritTypeMap,
    unitMap,
    flavorTagMap,
    drinkDurationMap,
    glassTypeMap,
    techniqueMap,
  };
}
