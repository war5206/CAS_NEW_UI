import iconHome from '../assets/navigation/index.svg'
import iconSetting from '../assets/navigation/setting.svg'
import iconAlert from '../assets/navigation/alert.svg'
import iconAnalysis from '../assets/navigation/analysis.svg'
import iconOps from '../assets/navigation/ops.svg'
import iconMonitor from '../assets/navigation/cctv.svg'
import iconModeSelect from '../assets/navigation/modeSelect.svg'
import iconModeSetting from '../assets/navigation/modeSetting.svg'
import iconDeviceParam from '../assets/navigation/deviceParam.svg'
import iconBasicSetting from '../assets/navigation/basicSetting.svg'
import iconSystemAlert from '../assets/navigation/systemAlert.svg'
import iconAlertTree from '../assets/navigation/alertTree.svg'
import iconAlertAnalysis from '../assets/navigation/alertAnalysis.svg'
import iconDataOverview from '../assets/navigation/dataOverview.svg'
import iconElectricStatistic from '../assets/navigation/electricStatistic.svg'
import iconWaterStatistic from '../assets/navigation/waterStatistic.svg'
import iconHeatStatistic from '../assets/navigation/heatStatistic.svg'
import iconCoolStatistic from '../assets/navigation/coolStatistic.svg'
import iconExpenseAnalysis from '../assets/navigation/expenseAnalysis.svg'
import iconSystemManagement from '../assets/navigation/systemManagement.svg'
import iconDeviceManagement from '../assets/navigation/deviceManagement.svg'
import iconDocManagement from '../assets/navigation/docManagement.svg'
import iconSystemInstruction from '../assets/navigation/systemInstruction.svg'
import iconDetectorInstruction from '../assets/navigation/detectorInstruction.svg'

export const modules = [
  {
    id: 'home',
    label: '首页',
    path: 'home',
    icon: iconHome,
    sections: [],
  },
  {
    id: 'settings',
    label: '设置',
    breadcrumb: '系统设置',
    path: 'settings',
    icon: iconSetting,
    sections: [
      { id: 'mode-select', label: '模式选择', path: 'mode-select', tabs: [] },
      {
        id: 'mode-setting',
        label: '模式设置',
        path: 'mode-setting',
        tabs: [
          { id: 'climate', label: '气候补偿', path: 'climate-compensation' },
          { id: 'timer', label: '智能定时', path: 'smart-timer' },
          { id: 'start-stop', label: '智能启停', path: 'smart-start-stop' },
          { id: 'peak', label: '峰谷调节', path: 'peak-valley' },
          { id: 'coupling', label: '耦合能源', path: 'coupling-energy' },
        ],
      },
      {
        id: 'device-params',
        label: '设备参数',
        path: 'device-params',
        tabs: [
          { id: 'hp-loop-pump', label: '热泵循环泵', path: 'heat-pump-loop-pump' },
          // { id: 'terminal-loop-pump', label: '末端循环泵', path: 'terminal-loop-pump' },
          { id: 'heat-pump', label: '热泵', path: 'heat-pump' },
          { id: 'heat-trace', label: '伴热带', path: 'heat-trace' },
          { id: 'constant-pressure-pump', label: '定压泵', path: 'constant-pressure-pump' },
          { id: 'drain-valve', label: '排污阀', path: 'drain-valve' },
          { id: 'relief-valve', label: '泄压阀', path: 'relief-valve' },
        ],
      },
      {
        id: 'base-setting',
        label: '基础设置',
        path: 'base-setting',
        tabs: [
          { id: 'system-params', label: '系统参数', path: 'system-params' },
          { id: 'system-reset', label: '系统重置', path: 'system-reset' },
          { id: 'device-lock', label: '设备锁定', path: 'device-lock' },
          { id: 'operation-log', label: '操作日志', path: 'operation-log' },
        ],
      },
    ],
  },
  {
    id: 'alerts',
    label: '告警',
    path: 'alerts',
    icon: iconAlert,
    sections: [
      { id: 'system-alarm', label: '系统报警', path: 'system-alarm', tabs: [] },
      { id: 'fault-tree', label: '故障树', path: 'fault-tree', tabs: [] },
      { id: 'alarm-analysis', label: '告警分析', path: 'alarm-analysis', tabs: [] },
    ],
  },
  {
    id: 'analysis',
    label: '分析',
    path: 'analysis',
    icon: iconAnalysis,
    sections: [
      { id: 'data-overview', label: '数据综述', path: 'data-overview', tabs: [] },
      { id: 'power', label: '用电统计', path: 'power-statistics', tabs: [] },
      { id: 'water', label: '用水统计', path: 'water-statistics', tabs: [] },
      { id: 'heat', label: '热量统计', path: 'heat-statistics', tabs: [] },
      { id: 'cold', label: '冷量统计', path: 'cold-statistics', tabs: [] },
      { id: 'cost', label: '费用分析', path: 'cost-analysis', tabs: [] },
    ],
  },
  {
    id: 'operations',
    label: '运维',
    breadcrumb: '运维管理',
    path: 'operations',
    icon: iconOps,
    sections: [
      {
        id: 'system-management',
        label: '系统管理',
        path: 'system-management',
        tabs: [
          { id: 'status-data', label: '系统状态数据', path: 'system-status-data' },
          { id: 'setting-data', label: '系统设置数据', path: 'system-setting-data' },
          { id: 'unit-data', label: '热泵机组数据', path: 'heat-pump-unit-data' },
        ],
      },
      {
        id: 'device-management',
        label: '设备管理',
        path: 'device-management',
        tabs: [
          { id: 'ops-heat-pump', label: '热泵', path: 'heat-pump' },
          { id: 'ops-loop-pump', label: '热泵循环泵', path: 'heat-pump-loop-pump' },
          { id: 'ops-coupling', label: '耦合能源', path: 'coupling-energy' },
        ],
      },
      { id: 'archive', label: '档案管理', path: 'archive-management', tabs: [] },
      { id: 'manual', label: '系统说明书', path: 'system-manual', tabs: [] },
      { id: 'sensor-manual', label: '探头型号说明书', path: 'sensor-manual', tabs: [] },
    ],
  },
  {
    id: 'monitor',
    label: '监控',
    path: 'monitor',
    icon: iconMonitor,
    sections: [],
  },
]

const sectionIconMap = {
  'mode-select': iconModeSelect,
  'mode-setting': iconModeSetting,
  'device-params': iconDeviceParam,
  'base-setting': iconBasicSetting,
  'system-alarm': iconSystemAlert,
  'fault-tree': iconAlertTree,
  'alarm-analysis': iconAlertAnalysis,
  'data-overview': iconDataOverview,
  power: iconElectricStatistic,
  water: iconWaterStatistic,
  heat: iconHeatStatistic,
  cold: iconCoolStatistic,
  cost: iconExpenseAnalysis,
  'system-management': iconSystemManagement,
  'device-management': iconDeviceManagement,
  archive: iconDocManagement,
  manual: iconSystemInstruction,
  'sensor-manual': iconDetectorInstruction,
}

for (const module of modules) {
  for (const section of module.sections ?? []) {
    section.icon = sectionIconMap[section.id]
  }
}

export const buildModulePath = (module) => `/${module.path}`

export const buildSectionPath = (module, section) => `${buildModulePath(module)}/${section.path}`

export const buildTabPath = (module, section, tab) => `${buildSectionPath(module, section)}/${tab.path}`

export const getSectionDefaultPath = (module, section) => {
  if (!section.tabs?.length) {
    return buildSectionPath(module, section)
  }
  return buildTabPath(module, section, section.tabs[0])
}

export const getModuleDefaultPath = (module) => {
  if (!module.sections?.length) {
    return buildModulePath(module)
  }
  return getSectionDefaultPath(module, module.sections[0])
}

export const createRedirectEntries = () => {
  const entries = []
  for (const module of modules) {
    if (module.sections?.length) {
      entries.push({
        from: buildModulePath(module),
        to: getModuleDefaultPath(module),
      })
    }

    for (const section of module.sections ?? []) {
      if (section.tabs?.length) {
        entries.push({
          from: buildSectionPath(module, section),
          to: getSectionDefaultPath(module, section),
        })
      }
    }
  }
  return entries
}

export const createPageEntries = () => {
  const entries = []

  for (const module of modules) {
    if (!module.sections?.length) {
      entries.push({
        key: module.id,
        path: buildModulePath(module),
        module,
        section: null,
        tab: null,
      })
      continue
    }

    for (const section of module.sections) {
      if (!section.tabs?.length) {
        entries.push({
          key: `${module.id}-${section.id}`,
          path: buildSectionPath(module, section),
          module,
          section,
          tab: null,
        })
        continue
      }

      for (const tab of section.tabs) {
        entries.push({
          key: `${module.id}-${section.id}-${tab.id}`,
          path: buildTabPath(module, section, tab),
          module,
          section,
          tab,
        })
      }
    }
  }

  return entries
}
