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
