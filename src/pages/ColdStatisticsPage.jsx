import ResourceStatisticsPage from './ResourceStatisticsPage'
import { useAnalysisProjectContextQuery } from '../features/analysis/hooks/useAnalysisProjectContextQuery'
import { getColdTitleOptions } from '../config/analysisProjectContext'

function ColdStatisticsPage() {
  const projectContext = useAnalysisProjectContextQuery()
  const coldTitleOptions = getColdTitleOptions(projectContext.data.systemTypeId)
  const titleOverride = coldTitleOptions[0]?.label

  return <ResourceStatisticsPage pageType="cold" titleOverride={titleOverride} />
}

export default ColdStatisticsPage
