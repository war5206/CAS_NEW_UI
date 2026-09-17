import { describe, expect, it } from 'vitest'
import { adaptAnalysisTrendViewModel } from './analysis'

const options = {
  cardLabels: ['总值', '均值'],
  unit: 'kWh',
  color: '#723DFD',
  legendName: '用电量',
  xAxisName: '日',
  currentTotalLabel: '当前总用电量',
  compareNames: { mom: '上一周期用电量', yoy: '去年同期用电量' },
}

describe('adaptAnalysisTrendViewModel', () => {
  it('应把后端真实上期数据传入图表模型', () => {
    const result = adaptAnalysisTrendViewModel(
      {
        allValue: '30.00',
        avgValue: '15.00',
        xList: ['1日', '2日'],
        yMap: {
          y1CurrentList: [10, 20],
          y1PreviousList: [7, 13],
        },
      },
      options,
    )

    expect(result.chartModel.compareBasisData).toEqual([10, 20])
    expect(result.chartModel.previousData).toEqual([7, 13])
  })

  it('后端未返回上期数据时不应生成模拟数据', () => {
    const result = adaptAnalysisTrendViewModel(
      {
        allValue: '30.00',
        avgValue: '15.00',
        xList: ['1日', '2日'],
        yMap: { y1CurrentList: [10, 20] },
      },
      options,
    )

    expect(result.chartModel.previousData).toBeNull()
  })
})
