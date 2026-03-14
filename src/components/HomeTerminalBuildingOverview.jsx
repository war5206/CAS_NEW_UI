import { useState } from 'react'
import fanCoilUnitIcon from '../assets/device/fan-coil-unit.svg'
import radiatorIcon from '../assets/device/radiator.svg'
import floorHeatingIcon from '../assets/device/floor-heating.svg'
import heatingActiveIcon from '../assets/device/heating-active.svg'
import heatingInactiveIcon from '../assets/device/heating-inactive.svg'
import coolingActiveIcon from '../assets/device/cooling-active.svg'
import coolingInactiveIcon from '../assets/device/cooling-inactive.svg'
import SelectDropdown from './SelectDropdown'

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
  [ROOM_MODE.HEATING]: '供暖',
  [ROOM_MODE.COOLING]: '制冷',
}

const TERMINAL_LABEL = {
  [TERMINAL_TYPE.FAN_COIL]: '风机盘管',
  [TERMINAL_TYPE.RADIATOR]: '暖气片',
  [TERMINAL_TYPE.FLOOR_HEATING]: '地暖',
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

const FLOOR_OPTIONS = Array.from({ length: 6 }, (_, index) => {
  const floor = String(index + 1)
  return {
    value: floor,
    label: `${floor}楼`,
  }
})

const ROOM_TEMPLATE_LIST = [
  { suffix: '01', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.FAN_COIL, temperature: 28, isOn: true },
  { suffix: '02', mode: ROOM_MODE.COOLING, terminal: TERMINAL_TYPE.FAN_COIL, temperature: 28, isOn: true },
  { suffix: '03', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.FAN_COIL, temperature: 28, isOn: true },
  { suffix: '04', mode: ROOM_MODE.COOLING, terminal: TERMINAL_TYPE.FAN_COIL, temperature: 28, isOn: false },
  { suffix: '05', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.RADIATOR, temperature: 28, isOn: true },
  { suffix: '06', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.RADIATOR, temperature: 28, isOn: false },
  { suffix: '07', mode: ROOM_MODE.HEATING, terminal: TERMINAL_TYPE.FLOOR_HEATING, temperature: 28, isOn: true },
  { suffix: '08', mode: ROOM_MODE.COOLING, terminal: TERMINAL_TYPE.FLOOR_HEATING, temperature: 28, isOn: false },
]

const INITIAL_ROOMS_BY_FLOOR = FLOOR_OPTIONS.reduce((accumulator, option) => {
  accumulator[option.value] = ROOM_TEMPLATE_LIST.map((room) => ({
    id: `${option.value}${room.suffix}`,
    mode: room.mode,
    terminal: room.terminal,
    temperature: room.temperature,
    isOn: room.isOn,
  }))
  return accumulator
}, {})

const formatTemperature = (value) => `${value}℃`

function HomeTerminalBuildingOverview() {
  const [selectedFloor, setSelectedFloor] = useState('4')
  const [roomsByFloor, setRoomsByFloor] = useState(INITIAL_ROOMS_BY_FLOOR)
  const currentRooms = roomsByFloor[selectedFloor] ?? []
  const selectedFloorLabel = FLOOR_OPTIONS.find((option) => option.value === selectedFloor)?.label ?? `${selectedFloor}楼`
  const isMasterOn = currentRooms.length > 0 && currentRooms.every((room) => room.isOn)

  const toggleRoom = (roomId) => {
    setRoomsByFloor((current) => ({
      ...current,
      [selectedFloor]: (current[selectedFloor] ?? []).map((room) => {
        if (room.id !== roomId) {
          return room
        }
        return {
          ...room,
          isOn: !room.isOn,
        }
      }),
    }))
  }

  const toggleMaster = () => {
    const next = !isMasterOn
    setRoomsByFloor((current) => ({
      ...current,
      [selectedFloor]: (current[selectedFloor] ?? []).map((room) => ({
        ...room,
        isOn: next,
      })),
    }))
  }

  return (
    <div className="home-building-overview">
      <div className="home-building-content">
        <div className="home-building-toolbar">
          <SelectDropdown
            value={selectedFloor}
            options={FLOOR_OPTIONS}
            onChange={setSelectedFloor}
            className="home-building-floor-select"
            triggerClassName="home-building-floor-button"
            dropdownClassName="home-building-floor-menu"
            optionClassName="home-building-floor-option"
            triggerAriaLabel={`选择楼层，当前${selectedFloorLabel}`}
            listAriaLabel="楼层列表"
          />
        </div>

        <section className="home-building-master-row">
          <h2 className="home-building-master-title">{selectedFloorLabel}总控</h2>
          <button
            type="button"
            className={`home-building-switch home-building-switch--master${isMasterOn ? ' is-on' : ''}`}
            onClick={toggleMaster}
            aria-label={isMasterOn ? `关闭${selectedFloorLabel}总控` : `开启${selectedFloorLabel}总控`}
          >
            <span className="home-building-switch-thumb" />
          </button>
        </section>

        <section className="home-building-room-grid" aria-label={`${selectedFloorLabel}房间`}>
          {currentRooms.map((room, index) => {
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
