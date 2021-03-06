const React = require('react')
const findDOMNode = require('react-dom').findDOMNode;
const scrollIntoView = require('dom-scroll-into-view')

let _debugStates = []

let Autocomplete = React.createClass({

  propTypes: {
    initialValue: React.PropTypes.any,
    onChange: React.PropTypes.func,
    onSelect: React.PropTypes.func,
    shouldItemRender: React.PropTypes.func,
    renderItem: React.PropTypes.func.isRequired,
    menuStyle: React.PropTypes.object,
    inputProps: React.PropTypes.object,
    isComplete: React.PropTypes.bool
  },

  getDefaultProps () {
    return {
      inputProps: {},
      onChange () {},
      onSelect (value, item) {},
      renderMenu (items, value, style) {
        return <div style={{...style, ...this.menuStyle}} children={items}/>
      },
      shouldItemRender () { return true },
      menuStyle: {
        borderRadius: '3px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '2px 0',
        fontSize: '90%',
        position: 'fixed',
        overflow: 'auto',
        maxHeight: '50%', // TODO: don't cheat, let it flow to the bottom
      }
    }
  },

  getInitialState () {
    return {
      value: this.props.initialValue || '',
      isOpen: false,
      highlightedIndex: 0,
    }
  },

  componentWillMount () {
    this._ignoreBlur = false
    this._performAutoCompleteOnUpdate = false
    this._performAutoCompleteOnKeyUp = false
  },

  componentWillReceiveProps (nextProps) {
    this._performAutoCompleteOnUpdate = true
    this.setState({
      value: nextProps.value
    })
  },

  componentDidUpdate (prevProps, prevState) {
    if (this.state.isOpen === true && prevState.isOpen === false)
      this.setMenuPositions()

    if (this.state.isOpen && this._performAutoCompleteOnUpdate) {
      this._performAutoCompleteOnUpdate = false
    }

    this.maybeScrollItemIntoView()
  },

  maybeScrollItemIntoView () {
    if (this.state.isOpen === true && this.state.highlightedIndex !== 0) {
      var itemNode = findDOMNode(this.refs[`item-${this.state.highlightedIndex}`])
      var menuNode = findDOMNode(this.refs.menu)
      scrollIntoView(itemNode, menuNode, { onlyScrollIfNeeded: true })
    }
  },

  handleHighLightedIndexChange() {
    if (this.props.handleHighLightedIndexChange) {
      this.props.handleHighLightedIndexChange(this.props.items[this.state.highlightedIndex]);
    }
  },

  handleKeyDown (event) {
    if (this.keyDownHandlers[event.key])
      this.keyDownHandlers[event.key].call(this, event)
    else {
      this.setState({
        highlightedIndex: 0,
        isOpen: true
      })
    }
  },

  handleChange (event) {
    this._performAutoCompleteOnKeyUp = true
    this.setState({
      value: event.target.value,
    }, () => {
      this.props.onChange(event, this.state.value)
    })
  },

  handleKeyUp () {
    if (this._performAutoCompleteOnKeyUp) {
      this._performAutoCompleteOnKeyUp = false
    }
  },

  keyDownHandlers: {
    ArrowDown (event) {
      event.preventDefault()
      var { highlightedIndex } = this.state
      var index = (
        highlightedIndex === null ||
        highlightedIndex === this.getFilteredItems().length - 1
      ) ?  0 : highlightedIndex + 1
      this._performAutoCompleteOnKeyUp = true
      this.setState({
        highlightedIndex: index,
        isOpen: true,
      }, () => {
        return this.handleHighLightedIndexChange()
      })
    },

    ArrowUp (event) {
      event.preventDefault()
      var { highlightedIndex } = this.state
      var index = (
        highlightedIndex === 0 ||
        highlightedIndex === null
      ) ? this.getFilteredItems().length - 1 : highlightedIndex - 1
      this._performAutoCompleteOnKeyUp = true
      this.setState({
        highlightedIndex: index,
        isOpen: true,
      }, () => {
        return this.handleHighLightedIndexChange()
      })
    },

    ArrowRight (event) {
      this.selectItemFromKeyEvent(event)
    },

    Enter (event) {
      this.selectItemFromKeyEvent(event)
    },

    Escape (event) {
      this.setState({
        highlightedIndex: 0,
        isOpen: false
      })
    }
  },

  getFilteredItems () {
    let items = this.props.items

    if (this.props.shouldItemRender) {
      items = items.filter((item) => (
        this.props.shouldItemRender(item, this.state.value)
      ))
    }

    if (this.props.sortItems) {
      items.sort((a, b) => (
        this.props.sortItems(a, b, this.state.value)
      ))
    }

    return items
  },

  setMenuPositions () {
    var node = this.refs.input
    var rect = node.getBoundingClientRect()
    var computedStyle = getComputedStyle(node)
    var marginBottom = parseInt(computedStyle.marginBottom, 10)
    var marginLeft = parseInt(computedStyle.marginLeft, 10)
    var marginRight = parseInt(computedStyle.marginRight, 10)
    this.setState({
      menuTop: rect.bottom + marginBottom,
      menuLeft: rect.left + marginLeft,
      menuWidth: rect.width + marginLeft + marginRight
    })
  },

  highlightItemFromMouse (index) {
    this.setState({ highlightedIndex: index }, () => {
      return this.handleHighLightedIndexChange()
    })
  },

  selectItemFromMouse (item) {
    this.setState({
      value: this.props.getItemValue(item),
      isOpen: false,
      highlightedIndex: 0
    }, () => {
      this.props.onSelect(this.state.value, item)
      this.refs.input.focus()
      this.setIgnoreBlur(false)
    })
  },

  selectItemFromKeyEvent (event) {
    if (this.state.isOpen === false) {
      // already selected this, do nothing
      return
    }
    else if (this.state.highlightedIndex == null) {
      // hit enter after focus but before typing anything so no autocomplete attempt yet
      this.setState({
        isOpen: false
      }, () => {
        findDOMNode(this.refs.input).select()
      })
    }
    else {
      var item = this.getFilteredItems()[this.state.highlightedIndex]
      this.setState({
        value: this.props.getItemValue(item),
        isOpen: false,
        highlightedIndex: 0
      }, () => {
        this.props.onSelect(this.state.value, item)
      })
    }
  },

  setIgnoreBlur (ignore) {
    this._ignoreBlur = ignore
  },

  renderMenu () {
    var items = this.getFilteredItems().map((item, index) => {
      var element = this.props.renderItem(
        item,
        this.state.highlightedIndex === index,
        {cursor: 'default'}
      )
      return React.cloneElement(element, {
        onMouseDown: () => this.setIgnoreBlur(true),
        onMouseEnter: () => this.highlightItemFromMouse(index),
        onClick: () => this.selectItemFromMouse(item),
        ref: `item-${index}`,
      })
    })
    var style = {
      left: this.state.menuLeft,
      top: this.state.menuTop,
      minWidth: this.state.menuWidth,
    }
    var menu = this.props.renderMenu(items, this.state.value, style)
    return React.cloneElement(menu, { ref: 'menu' })
  },

  handleInputBlur () {
    if (this._ignoreBlur)
      return
    this.setState({
      isOpen: false,
      highlightedIndex: 0
    }, () => {
      if (this.props.onBlur) {
        this.props.onBlur();
      }
    })
  },

  handleInputFocus () {
    if (this._ignoreBlur)
      return
    this.setState({ isOpen: true })
  },

  handleInputClick () {
    if (this.state.isOpen === false)
      this.setState({ isOpen: true })
  },

  render () {
    if (this.props.debug) { // you don't like it, you love it
      _debugStates.push({
        id: _debugStates.length,
        state: this.state
      })
    }
    return (
      <div style={{display: 'inline-block'}}>
        <input
          {...this.props.inputProps}
          role="combobox"
          aria-autocomplete="both"
          ref="input"
          onFocus={this.handleInputFocus}
          onBlur={this.handleInputBlur}
          onChange={(event) => this.handleChange(event)}
          onKeyDown={(event) => this.handleKeyDown(event)}
          onKeyUp={(event) => this.handleKeyUp(event)}
          onClick={this.handleInputClick}
          value={this.state.value}
        />
        {this.state.isOpen && this.renderMenu()}
        {this.props.debug && (
          <pre style={{marginLeft: 300}}>
            {JSON.stringify(_debugStates.slice(_debugStates.length - 5, _debugStates.length), null, 2)}
          </pre>
        )}
      </div>
    )
  }
})

module.exports = Autocomplete
