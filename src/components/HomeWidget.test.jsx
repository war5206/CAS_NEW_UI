import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HomeWidget from './HomeWidget'

describe('HomeWidget', () => {
  it('应渲染标题与内容', () => {
    render(
      <HomeWidget title="运行模式" icon="/icon.svg">
        <div data-testid="widget-content">内容</div>
      </HomeWidget>,
    )

    expect(screen.getByText('运行模式')).toBeInTheDocument()
    expect(screen.getByTestId('widget-content')).toBeInTheDocument()
  })

  it('应渲染右上角插槽', () => {
    render(
      <HomeWidget title="能耗统计" icon="/icon.svg" titleRight={<span data-testid="title-right">详情</span>}>
        <div>内容</div>
      </HomeWidget>,
    )

    expect(screen.getByTestId('title-right')).toBeInTheDocument()
  })
})
