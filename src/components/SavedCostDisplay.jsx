import saveMoneyIcon from '../assets/saveMoney.png'

const MIN_INTEGER_DIGITS = 6

const parseValue = (value) => {
  const text = String(value ?? '').trim().replace(/,/g, '')

  if (!text) {
    return { integerPart: '0', decimalPart: '' }
  }

  const directMatch = text.match(/^(\d+)(?:\.(\d+))?$/)
  if (directMatch) {
    return {
      integerPart: directMatch[1],
      decimalPart: directMatch[2] ?? '',
    }
  }

  const [rawInteger = '', rawDecimal = ''] = text.split('.', 2)
  const integerPart = rawInteger.replace(/\D/g, '') || '0'
  const decimalPart = rawDecimal.replace(/\D/g, '')

  return { integerPart, decimalPart }
}

function SavedCostDisplay({ value = '000222.7' }) {
  const { integerPart, decimalPart } = parseValue(value)
  const formattedInteger =
    integerPart.length <= MIN_INTEGER_DIGITS ? integerPart.padStart(MIN_INTEGER_DIGITS, '0') : integerPart
  let sizeLevelClass = ''
  if (integerPart.length > 10) {
    sizeLevelClass = ' is-compact-10'
  } else if (integerPart.length > 8) {
    sizeLevelClass = ' is-compact-8'
  } else if (integerPart.length > MIN_INTEGER_DIGITS) {
    sizeLevelClass = ' is-compact-6'
  }
  const displayChars = decimalPart ? [...formattedInteger, '.', ...decimalPart] : [...formattedInteger]

  return (
    <div className="saved-cost-panel">
      <div className="saved-cost-header">
        <div className="saved-cost-label-wrap">
          <img src={saveMoneyIcon} alt="" aria-hidden="true" className="saved-cost-money-icon" />
          <div className="saved-cost-label">{'\u5df2\u8282\u7701\u8d39\u7528'}</div>
        </div>
        <div className="saved-cost-unit">{'\uff08\u5143\uff09'}</div>
      </div>

      <div className={`saved-cost-digits${sizeLevelClass}`} aria-label={'\u5df2\u8282\u7701\u8d39\u7528\u6570\u503c'}>
        {displayChars.map((char, index) =>
          char === '.' ? (
            <span key={`dot-${index}`} className="saved-cost-dot" aria-hidden="true">
              .
            </span>
          ) : (
            <span key={`digit-${index}`} className="saved-cost-digit">
              {char}
            </span>
          ),
        )}
      </div>
    </div>
  )
}

export default SavedCostDisplay
