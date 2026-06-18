import ResourceStatisticsPage from './ResourceStatisticsPage'
import { useAnalysisProjectContextQuery } from '../features/analysis/hooks/useAnalysisProjectContextQuery'
import { getHeatTitleOptions } from '../config/analysisProjectContext'

function HeatStatisticsPage() {
  const projectContext = useAnalysisProjectContextQuery()
  const heatTitleOptions = getHeatTitleOptions(projectContext.data.systemTypeId)
  const titleOverride = heatTitleOptions[0]?.label

  return <ResourceStatisticsPage pageType="heat" titleOverride={titleOverride} />
}

export default HeatStatisticsPage
