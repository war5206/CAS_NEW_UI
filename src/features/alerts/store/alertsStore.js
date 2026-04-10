import { useSyncExternalStore } from 'react'
import { HISTORY_ALARM_ROWS, SYSTEM_ALARM_ROWS } from './alertsSharedData'

const listeners = new Set()

let state = {
  liveRows: SYSTEM_ALARM_ROWS,
  historyRows: HISTORY_ALARM_ROWS,
  ignored: false,
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useAlertsStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function processLiveAlarm(row) {
  state = {
    ...state,
    liveRows: state.liveRows.filter((item) => item.id !== row.id),
    historyRows: [
      {
        ...row,
        processedAt: '2026-03-13 20:19:00',
        suggestion: row.suggestion || '已处理',
      },
      ...state.historyRows,
    ],
  }
  emitChange()
}

export function deleteHistoryAlarm(rowId) {
  state = {
    ...state,
    historyRows: state.historyRows.filter((item) => item.id !== rowId),
  }
  emitChange()
}

export function ignoreAllAlerts() {
  state = {
    ...state,
    ignored: true,
  }
  emitChange()
}

export function clearIgnoredAlertsState() {
  state = {
    ...state,
    ignored: false,
  }
  emitChange()
}
