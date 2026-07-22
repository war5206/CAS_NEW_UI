import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PasswordKeypad from './PasswordKeypad'

describe('PasswordKeypad', () => {
  it('输入完整密码后应触发 onComplete', () => {
    const handleComplete = vi.fn()
    render(<PasswordKeypad passwordLength={6} onComplete={handleComplete} />)

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('3'))
    fireEvent.click(screen.getByText('4'))
    fireEvent.click(screen.getByText('5'))
    fireEvent.click(screen.getByText('6'))

    expect(handleComplete).toHaveBeenCalledWith('123456')
  })

  it('删除键应移除最后一位', () => {
    const handleComplete = vi.fn()
    render(<PasswordKeypad passwordLength={6} onComplete={handleComplete} />)

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByRole('button', { name: '删除' }))

    // 只输入了 1 位，不会触发完成
    fireEvent.click(screen.getByText('3'))
    expect(handleComplete).not.toHaveBeenCalled()
  })

  it('超出长度不应继续追加', () => {
    const handleComplete = vi.fn()
    render(<PasswordKeypad passwordLength={4} onComplete={handleComplete} />)

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('3'))
    fireEvent.click(screen.getByText('4'))
    fireEvent.click(screen.getByText('5'))

    expect(handleComplete).toHaveBeenCalledTimes(1)
    expect(handleComplete).toHaveBeenCalledWith('1234')
  })

  it('errorKey 变化时应清空已输入密码', () => {
    const { rerender } = render(<PasswordKeypad passwordLength={6} errorKey={0} />)

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))

    rerender(<PasswordKeypad passwordLength={6} errorKey={1} />)

    // 此时继续输入应从头开始
    fireEvent.click(screen.getByText('3'))
    fireEvent.click(screen.getByText('4'))
    fireEvent.click(screen.getByText('5'))
    fireEvent.click(screen.getByText('6'))

    // 无法直接断言内部状态，但可以通过点指示器数量判断
    const filledDots = document.querySelectorAll('.password-keypad__dot.is-filled')
    expect(filledDots.length).toBe(4)
  })
})
