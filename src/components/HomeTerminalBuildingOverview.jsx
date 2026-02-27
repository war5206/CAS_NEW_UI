import { useState } from 'react'
import fanCoilUnitIcon from '../assets/device/fan-coil-unit.svg'
import radiatorIcon from '../assets/device/radiator.svg'
import floorHeatingIcon from '../assets/device/floor-heating.svg'
import heatingActiveIcon from '../assets/device/heating-active.svg'
import heatingInactiveIcon from '../assets/device/heating-inactive.svg'
import coolingActiveIcon from '../assets/device/cooling-active.svg'
import coolingInactiveIcon from '../assets/device/cooling-inactive.svg'

const ROOM_MODE = {
  HEATING: 'heating',
  COOLING: 'cooling',
}

const TERMINAL_TYPE = {
  FAN_COIL: 'fan-coil',
  RADIATOR: 'radiator',
  FLOOR_HEATING: 'floor-heating',
}

const ROOM_MODE_LABEL = {
  [ROOM_MODE.HEATING]: '渚涙殩',
  [ROOM_MODE.COOLING]: '鍒跺喎',
}

const TERMINAL_LABEL = {
  [TERMINAL_TYPE.FAN_COIL]: '椋庢満鐩樼',
  [TERMINAL_TYPE.RADIATOR]: '暖气片',
  [TERMINAL_TYPE.FLOOR_HEATING]: '鍦版殩',
}

const MODE_ICON_MAP = {
  [ROOM_MODE.HEATING]: {
    on: heatingActiveIcon,
    off: heatingInactiveIcon,
  },
  [ROOM_MODE.COOLING]: {
    on: coolingActiveIcon,
    off: coolingInactiveIcon,
  },
}

const TERMINAL_ICON_MAP = {
  [TERMINAL_TYPE.FAN_COIL]: fanCoilUnitIcon,
  [TERMINAL_TYPE.RADIATOR]: radiatorIcon,
  [TERMINAL_TYPE.FLOOR_HEATING]: floorHeatingIcon,
}

const ROOM_LIST = [
  { id: '401', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.FAN_COIL, temperature: 28, isOn: true },
  { id: '402', mode: ROOM_MODE.COOLING, terminal: TERMINAL_TYPE.FAN_COIL, temperature: 28, isOn: true },
  { id: '403', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.FAN_COIL, temperature: 28, isOn: true },
  { id: '404', mode: ROOM_MODE.COOLING, terminal: TERMINAL_TYPE.FAN_COIL, temperature: 28, isOn: false },
  { id: '405', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.RADIATOR, temperature: 28, isOn: true },
  { id: '406', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.RADIATOR, temperature: 28, isOn: false },
  { id: '407', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.FLOOR_HEATING, temperature: 28, isOn: true },
  { id: '408', mode: ROOM_MODE.COOLING, terminal: TERMINAL_TYPE.FLOOR_HEATING, temperature: 28, isOn: false },
]

const formatTemperature = (value) => `${value}℃`

function HomeTerminalBuildingOverview() {
  const [rooms, setRooms] = useState(ROOM_LIST)
  const [isMasterOn, setIsMasterOn] = useState(false)

  const toggleRoom = (roomId) => {
    setRooms((current) =>
      current.map((room) => {
        if (room.id !== roomId) {
          return room
        }
        return {
          ...room,
          isOn: !room.isOn,
        }
      }),
    )
  }

  const toggleMaster = () => {
    setIsMasterOn((current) => {
      const next = !current
      setRooms((roomList) =>
        roomList.map((room) => ({
          ...room,
          isOn: next,
        })),
      )
      return next
    })
  }

  return (
    <div className="home-building-overview">
      <div className="home-building-content">
        <div className="home-building-toolbar">
          <button type="button" className="home-building-floor-button" aria-label="当前楼层 4 楼">
            4楼
          </button>
        </div>

        <section className="home-building-master-row">
          <h2 className="home-building-master-title">鎬绘帶</h2>
          <button
            type="button"
            className={`home-building-switch home-building-switch--master${isMasterOn ? ' is-on' : ''}`}
            onClick={toggleMaster}
            aria-label={isMasterOn ? '鍏抽棴鎬绘帶' : '寮€鍚€绘帶'}
          >
            <span className="home-building-switch-thumb" />
          </button>
        </section>

        <section className="home-building-room-grid" aria-label="妤煎眰鎴块棿">
          {rooms.map((room, index) => {
            const modeIcon = MODE_ICON_MAP[room.mode]?.[room.isOn ? 'on' : 'off']
            const terminalIcon = TERMINAL_ICON_MAP[room.terminal]
            return (
              <article
                key={room.id}
                className={`home-building-room${room.isOn ? ' is-on' : ' is-off'}`}
                style={{ '--building-card-delay': `${index * 45}ms` }}
              >
                <header className="home-building-room-head">
                  <span className="home-building-room-no">{room.id}</span>
                  <span className="home-building-room-divider" />
                  <span className="home-building-room-mode">
                    <img src={modeIcon} alt="" aria-hidden="true" className="home-building-room-mode-icon" />
                    <span className="home-building-room-mode-label">{ROOM_MODE_LABEL[room.mode]}</span>
                  </span>
                  <span className="home-building-room-divider" />
                  <span className="home-building-room-temp">{formatTemperature(room.temperature)}</span>
                </header>

                <div className="home-building-room-foot">
                  <span className="home-building-terminal">
                    <img src={terminalIcon} alt="" aria-hidden="true" className="home-building-terminal-icon" />
                    <span className="home-building-terminal-label">{TERMINAL_LABEL[room.terminal]}</span>
                  </span>
                  <button
                    type="button"
                    className={`home-building-switch${room.isOn ? ' is-on' : ''}`}
                    onClick={() => toggleRoom(room.id)}
                    aria-label={room.isOn ? `${room.id}关闭` : `${room.id}开启`}
                  >
                    <span className="home-building-switch-thumb" />
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </div>
  )
}

export default HomeTerminalBuildingOverview

