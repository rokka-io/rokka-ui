import React, { Fragment } from 'react'
import StringStackOption from '../options/StringStackOption'
import SelectStackOption from '../options/SelectStackOption'
import { readableInputLabel } from '../../utils/string'
import RangeStackOption from '../options/RangeStackOption'
import ColorStackOption from '../options/ColorStackOption'
import BooleanStackOption from '../options/BooleanStackOption'

function isRangeInput({ minimum, maximum }) {
  return maximum - minimum <= 100
}

const SORT_ORDERS = {
  range: 5,
  integer: 4,
  number: 4,
  boolean: 3,
  string: 2,
  color: 2,
  default: 0
}

/**
 * Returns the type used for sorting
 * @param {String} name
 * @param {String} definition
 * @returns {Integer}
 */
function getSortOrder(name, { type, ...definition }) {
  if (name.includes('color')) {
    return SORT_ORDERS['color']
  }
  let sortOrderType = type
  if (type === 'integer' && isRangeInput(definition)) {
    sortOrderType = 'range'
  }
  return SORT_ORDERS[sortOrderType] || SORT_ORDERS['default']
}

export default function StackOperation({
  availableOperations = {},
  name,
  values,
  onChange = null,
  errors = {}
}) {
  if (!availableOperations[name]) {
    return null
  }
  const { properties, required = [] } = availableOperations[name]

  const sortedProps = Object.keys(properties).sort(
    (a, b) => getSortOrder(b, properties[b]) - getSortOrder(a, properties[a])
  )

  const $rows = sortedProps.map(name => {
    const definition = properties[name]

    const operationProps = {
      key: name,
      label: readableInputLabel(name),
      name,
      definitions: definition,
      value: values[name],
      onChange,
      error: errors[name],
      required: required.includes(name)
    }

    if (Array.isArray(definition.values)) {
      return <SelectStackOption {...operationProps} />
    }
    if (name.includes('color')) {
      return <ColorStackOption {...operationProps} />
    }

    switch (definition.type) {
      case 'number':
      // fallthrough
      case 'integer':
        if (isRangeInput(definition)) {
          return <RangeStackOption {...operationProps} />
        }
        return <StringStackOption {...operationProps} />
      case 'boolean':
        return <BooleanStackOption {...operationProps} />
      default:
        return <StringStackOption {...operationProps} />
    }
  })

  return <Fragment>{$rows}</Fragment>
}
