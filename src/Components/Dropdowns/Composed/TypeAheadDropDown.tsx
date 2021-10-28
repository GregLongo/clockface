// Libraries
import React, {ChangeEvent, FC, useRef, useState} from 'react'
import classnames from 'classnames'
import {Dropdown} from '../.'
import {MenuStatus} from '../Dropdown'

import {
  ComponentStatus,
  DropdownMenuTheme,
  StandardFunctionProps,
} from '../../../Types'

import {Input} from '../../Inputs/Input'

export interface SelectableItem {
  id: string
  name?: string
}

interface OwnProps extends StandardFunctionProps {
  items: SelectableItem[]
  onSelect: (item: SelectableItem | null) => void
  placeholderText?: string
  name?: string
  selectedOption?: SelectableItem | null
  menuTheme?: DropdownMenuTheme
  disableAutoFocus?: boolean
  buttonTestId?: string
  menuTestID?: string
  itemTestIdPrefix?: string
  defaultNameText?: string
  sortNames?: boolean
}
const isBlank = (pString: string | undefined) =>
  // Checks for falsiness or a non-white space character
  !pString || !/[^\s]+/.test(pString)

const getValueWithBackup = (
  val: string | undefined,
  backup: string
): string => {
  if (isBlank(val)) {
    return backup
  }
  return val as string
}

export const TypeAheadDropDown: FC<OwnProps> = ({
  id,
  style,
  items,
  onSelect,
  testID,
  placeholderText,
  name,
  selectedOption,
  className,
  menuTheme,
  disableAutoFocus,
  buttonTestId,
  menuTestID,
  itemTestIdPrefix,
  sortNames,
  defaultNameText,
}) => {
  if (sortNames) {
    items.sort((a, b) => {
      const aname = a?.name || ''
      const bname = b?.name || ''
      return aname.localeCompare(bname)
    })
  }

  const [selectIndex, setSelectIndex] = useState(-1)
  const [shownValues, setShownValues] = useState(items)
  const [menuOpen, setMenuOpen] = useState<MenuStatus>(MenuStatus.Closed)

  const defaultDisplayName = getValueWithBackup(defaultNameText, '')

  let initialTypedValue = ''
  if (selectedOption) {
    initialTypedValue = getValueWithBackup(
      selectedOption.name,
      defaultDisplayName
    )
  } else {
    selectedOption = null
  }
  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(
    selectedOption
  )
  const [typedValue, setTypedValue] = useState<string>(initialTypedValue)

  buttonTestId = getValueWithBackup(buttonTestId, 'type-ahead-dropdown--button')
  menuTestID = getValueWithBackup(menuTestID, 'type-ahead-dropdown--menu')
  itemTestIdPrefix = getValueWithBackup(
    itemTestIdPrefix,
    'type-ahead-dropdown--item'
  )

  /**
   *  using a ref to hold an instance variable:  what was last typed,
   * because without this 'click to select' doesn't work.
   *  (you click to select, which clicks out of the dropdown, so then the dropdown sets
   * the text to what was last selected.  this works fine for a class component,
   * but here it uses the stale state of what was previously selected.
   * this way, what was selected is saved in the ref.
   */
  let backupValue = useRef<string>(initialTypedValue)

  if (!menuTheme) {
    menuTheme = DropdownMenuTheme.Onyx
  }
  if (!disableAutoFocus) {
    disableAutoFocus = false
  }

  const itemNames = items.map(item => item.name?.toLowerCase())

  const doFilter = (needle: string) => {
    if (!needle) {
      setShownValues(items)
      setTypedValue('')
      setSelectIndex(-1)
    } else {
      const result = items.filter(val => {
        const name = val?.name || ''
        return name.toLowerCase().includes(needle.toLowerCase())
      })

      // always reset the selectIndex when doing filtering;  because
      // if it had a value, and then they type, the shownValues changes
      // so need to reset
      setShownValues(result)
      setTypedValue(needle)
      setMenuOpen(MenuStatus.Open)
      setSelectIndex(-1)
    }
  }

  const clear = () => {
    doSelection(null)
    doFilter('')
  }

  const filterVals = (event: ChangeEvent<HTMLInputElement>) => {
    const needle = event?.target?.value
    // if there is no value, set the shownValues to everything
    // and set the typedValue to nothing (zero it out)
    // reset the selectIndex too
    doFilter(needle)
  }

  if (!placeholderText) {
    placeholderText = 'Select a Value'
  }

  if (!name) {
    name = 'header'
  }

  const setTypedValueToSelectedName = (backupName?: string) => {
    let selectedName = backupName ?? selectedItem?.name
    if (!selectedName) {
      selectedName = ''
    }
    setTypedValue(selectedName)
  }

  const maybeSelectNextItem = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    let newIndex = -1

    if (event.keyCode === 40) {
      // down arrow
      newIndex = selectIndex + 1
    } else if (event.keyCode === 38) {
      // up arrow
      newIndex = selectIndex - 1
    }

    const numItems = shownValues.length
    const newValueWasHighlighted =
      numItems && newIndex >= 0 && newIndex < numItems
    if (newValueWasHighlighted) {
      setSelectIndex(newIndex)
      return
    }

    if (event.keyCode === 13) {
      // return/enter key
      // lose focus??, reset the selectIndex to -1, & close the menu:
      //event.target.blur()

      if (numItems && selectIndex >= 0 && selectIndex < numItems) {
        // they used the arrows; just pressed return
        doSelection(shownValues[selectIndex], true)
      } else {
        // the person could have been typing and pressed return, need to
        // make sure the value in the input field is real/legal:

        // but:  if the value they typed is LEGAL (in the list/dropdown values), set it;
        // else: reset to the previous real/legal value:
        const foundIndex = itemNames.indexOf(typedValue.toLowerCase())

        if (foundIndex >= 0) {
          // is a real legal value
          doSelection(items[foundIndex], true)
        } else {
          setTypedValueToSelectedName()
          setMenuOpen(MenuStatus.Closed)
          setSelectIndex(-1)
        }
      }
    }
  }

  const getDisplayName = (item: SelectableItem | null): string => {
    if (item && item.id) {
      return getValueWithBackup(item.name, defaultDisplayName)
    }
    return ''
  }

  const doSelection = (item: SelectableItem | null, closeMenuNow?: boolean) => {
    setSelectedItem(item)
    const actualName = getDisplayName(item)
    setTypedValue(actualName)
    backupValue.current = actualName
    setSelectIndex(-1)

    if (closeMenuNow) {
      setMenuOpen(MenuStatus.Closed)
    }
    onSelect(item)
  }

  const onClickAwayHere = () => {
    //  reset to the selected value; if the user typed in
    //  something not allowed it will go back to the last selected value:
    setTypedValueToSelectedName(backupValue.current)
  }

  const dropdownStatus =
    items.length === 0 ? ComponentStatus.Disabled : ComponentStatus.Default

  // do rendering:
  const inputComponent = (
    <Input
      placeholder={placeholderText}
      onChange={filterVals}
      value={typedValue}
      onKeyDown={maybeSelectNextItem}
      testID={`dropdown-input-typeAhead--${name}`}
      onClear={clear}
    />
  )

  const props: any = {id, style, className, menuOpen}

  return (
    <Dropdown
      {...props}
      testID={testID || `typeAhead-dropdown--${name}`}
      onClickAway={onClickAwayHere}
      disableAutoFocus
      button={(active, onClick) => (
        <Dropdown.Button
          active={active}
          onClick={onClick}
          testID={buttonTestId}
          status={dropdownStatus}
        >
          {inputComponent}
        </Dropdown.Button>
      )}
      menu={onCollapse => (
        <Dropdown.Menu
          testID={menuTestID}
          onCollapse={onCollapse}
          theme={menuTheme}
        >
          {shownValues.map((value, index) => {
            // add the 'active' class to highlight when arrowing; like a hover
            const classN = classnames({
              active: index === selectIndex,
            })

            return (
              <Dropdown.Item
                key={value.id}
                id={value.id}
                value={value}
                onClick={doSelection}
                selected={value.id === selectedItem?.id}
                testID={`${itemTestIdPrefix}-${value.id}`}
                className={classN}
              >
                {value.name || defaultDisplayName}
              </Dropdown.Item>
            )
          })}
        </Dropdown.Menu>
      )}
    />
  )
}