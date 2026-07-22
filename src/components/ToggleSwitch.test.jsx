import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ToggleSwitch from './ToggleSwitch'

describe('ToggleSwitch', () => {
  it('未选中时点击应切换为开启', () => {
    const handleToggle = vi.fn()
    render(<ToggleSwitch checked={false} onToggle={handleToggle} ariaLabel="测试开关" />)

    const button = screen.getByRole('button', { name: '测试开关' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)
    expect(handleToggle).toHaveBeenCalled()
  })

  it('已选中时点击应关闭', () => {
    const handleToggle = vi.fn()
    render(<ToggleSwitch checked={true} onToggle={handleToggle} ariaLabel="测试开关" />)

    const button = screen.getByRole('button', { name: '测试开关' })
    expect(button).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button)
    expect(handleToggle).toHaveBeenCalled()
  })

  it('禁用时不应触发 onToggle', () => {
    const handleToggle = vi.fn()
    render(<ToggleSwitch checked={false} onToggle={handleToggle} disabled ariaLabel="测试开关" />)

    const button = screen.getByRole('button', { name: '测试开关' })
    fireEvent.click(button)
    expect(handleToggle).not.toHaveBeenCalled()
  })
})
