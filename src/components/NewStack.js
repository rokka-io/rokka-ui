import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import { authRequired } from '../utils/auth'
import { resetStackClone, createStack, refreshStacks, setAlert } from '../state'
import Operation from './operations'
import FormGroup from './forms/FormGroup'
import previewImage from './images/previewImage'
import Spinner from './Spinner'
import Alert from './Alert'
import rokka from '../rokka'
import Options from './Options'
import Ajv from 'ajv'
import cx from 'classnames'

function randomNumber (min, max) {
  return Math.random() * (max - min) + min
}

function generateRandomId () {
  const max = Math.random() * 10
  const min = Math.random() * 2

  return Date.now() + '-' + randomNumber(min, max)
}

function generateDefaultValuesStackOptions (options, stackOptions) {
  Object.keys(stackOptions).forEach((optionName) => {
    if (stackOptions[optionName].default !== undefined && options[optionName].value === null) {
      options[optionName] = {value: stackOptions[optionName].default}
    }
  })
  return options
}

const ajv = new Ajv({
  allErrors: true
})

const OPTIONS = ['png.compression_level', 'jpg.quality', 'webp.quality', 'interlacing.mode', 'basestack']

export class NewStack extends PureComponent {
  constructor (props) {
    super(props)

    const { stackClone = {} } = props

    let options = OPTIONS.reduce((acc, name) => {
      let value = null
      if (stackClone.options && stackClone.options[name]) {
        value = stackClone.options[name]
      }
      acc[name] = { value }

      return acc
    }, {})

    if (props.stackOptions) {
      options = generateDefaultValuesStackOptions(options, props.stackOptions.properties)
      this.optionValidator = ajv.compile(props.stackOptions)
    }

    if (stackClone.operations) {
      stackClone.operations.forEach((operation, i) => {
        operation['id'] = i.toString()
        operation['errors'] = {}
      })
    }

    this.state = {
      name: stackClone.name || '',
      options: options,
      operations: stackClone.operations || [],
      operationErrors: {},
      error: null,
      activeOperation: 0,
      showLoader: false,
      preview: {
        stack: null,
        imageLoading: false,
        updated: true,
        image: null,
        error: null
      }
    }

    this.onChange = this.onChange.bind(this)
    this.onChangeName = this.onChangeName.bind(this)
    this.onChangeOptions = this.onChangeOptions.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
    this.addOperation = this.addOperation.bind(this)
    this.removeOperation = this.removeOperation.bind(this)
    this.setActiveOperation = this.setActiveOperation.bind(this)
    this.onMoveOperation = this.onMoveOperation.bind(this)
    this.updatePreview = this.updatePreview.bind(this)
  }

  componentWillMount () {
    resetStackClone()
  }

  componentDidMount () {
    this.props.loadPreviewImage()
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.previewImage && this.props.previewImage && nextProps.previewImage.hash !== this.props.previewImage.hash) {
      this.updatePreview(nextProps.previewImage)
    }
    if (nextProps.stackOptions !== null && !this.optionValidator) {
      const defaultOptions = generateDefaultValuesStackOptions(Object.assign({}, this.state.options), nextProps.stackOptions.properties)
      this.optionValidator = ajv.compile(nextProps.stackOptions)

      this.setState({
        options: defaultOptions
      })
    }
    if (nextProps.operations !== null) {
      this.operationValidators = {}
      Object.keys(nextProps.operations).filter(key => key !== 'noop').forEach(key => {
        const operation = nextProps.operations[key]
        if (key === 'grayscale' && Array.isArray(operation.properties)) {
          operation.properties = {}
        }
        if (key === 'resize' && operation.oneOf && typeof operation.oneOf[0] === 'string') {
          delete operation.oneOf
        }
        this.operationValidators[key] = ajv.compile(operation)
      })
    }
  }

  addOperation (e) {
    e && e.preventDefault()

    this.setState({
      operations: [
        ...this.state.operations,
        {
          // react drag and drop requires a unique id which stays the same across reorders
          // otherwise when moving an operation from index 0 to 1, the element might need to be recreated
          // and react-dnd looses track of it.
          id: generateRandomId(),
          name: this.refs.operationsList.value,
          options: {},
          errors: {}
        }
      ],
      activeOperation: this.state.operations.length,
      preview: Object.assign({}, this.state.preview, {
        updated: false
      })
    })
  }

  onSubmit (e) {
    e.preventDefault()
    this.setState({ showLoader: true })

    let updateOperationsState = false

    const operations = this.state.operations.map(operation => {
      const valid = this.operationValidators[operation.name](operation.options)
      if (!valid) {
        updateOperationsState = true

        this.operationValidators[operation.name].errors.forEach((e) => {
          if (e.keyword === 'required') {
            operation.errors[e.params.missingProperty] = e.message
          } else {
            operation.errors[e.dataPath.replace('.', '')] = e.message
          }
        })
      }

      return operation
    })

    let options = {}
    Object.keys(this.state.options).forEach(key => {
      const option = this.state.options[key]
      if (key !== 'basestack' || (key === 'basestack' && option.value !== null)) {
        options[key] = option.value
      }
    })

    let updatedOptions = Object.assign({}, this.state.options)
    const valid = this.optionValidator(options)
    if (!valid) {
      updateOperationsState = true

      this.optionValidator.errors.forEach(e => {
        if (e.keyword === 'required') {
          updatedOptions[e.params.missingProperty].error = e.message
        } else if (e.dataPath.substring(0, 1) === '.') {
          updatedOptions[e.dataPath.replace('.', '')].error = e.message
        } else if (e.dataPath.substring(0, 1) === '[') {
          updatedOptions[e.dataPath.replace(/[['][^_]/g, '')].error = e.message
        }
      })
    }

    this.setState({
      operations: operations,
      options: updatedOptions
    })
    if (updateOperationsState) {
      return
    }

    Object.keys(options).forEach(key => {
      const val = options[key].value
      if (val === null || val === this.props.stackOptions.properties[key].default) {
        delete options[key]
      }
    })

    createStack(this.state.name, this.state.operations, options)
      .then(({ body }) => {
        return Promise.all([body, refreshStacks()])
      })
      .then(([result]) => {
        setAlert('success', `Stack ${result.name} created successfully.`, 2000)
        this.setState({ showLoader: false })
        this.props.router.push(`/stacks/${result.name}`)
      })
      .catch((error) => {
        this.setState({
          showLoader: false,
          error: error.error.error.message
        })
      })
  }

  onChange (idx, eventOrValue) {
    let { currentTarget = null, name, value } = eventOrValue

    if (currentTarget) {
      value = currentTarget.value
      name = currentTarget.name
    }

    let operation = this.state.operations[idx]

    const operationDefinition = this.props.operations[operation.name]

    if (operationDefinition && operationDefinition.properties[name].type === 'boolean') {
      value = value === 'true'
    } else if (operationDefinition && operationDefinition.properties[name].type === 'integer') {
      value = parseInt(value, 10)
      if (isNaN(value)) {
        value = ''
      }
    } else if (operationDefinition && operationDefinition.properties[name].type === 'number') {
      value = parseFloat(value)
      if (isNaN(value)) {
        value = ''
      }
    }

    operation = Object.assign({}, operation, {
      options: Object.assign({}, operation.options, {
        [name]: value
      })
    })
    const operations = [
      ...this.state.operations.slice(0, idx),
      operation,
      ...this.state.operations.slice(idx + 1)
    ]

    this.setState({ operations, preview: Object.assign({}, this.state.preview, { updated: false }) })
  }

  onChangeName (e) {
    this.setState({
      name: e.currentTarget.value
    })
  }

  /**
   * Triggered when stack options change.
   *
   * @param {Object|Event} eventOrOption If a change event is passed, name/value are retrieved from event.target.
   *                                     If an object with name and value is passed, those are used directly.
   */
  onChangeOptions (eventOrOption) {
    let { target = null, name, value } = eventOrOption
    if (target) {
      const target = eventOrOption.target
      value = target.type === 'checkbox' ? target.checked : target.value
      name = target.name
    }

    if (this.props.stackOptions && this.props.stackOptions.properties[name].type === 'boolean') {
      value = value === 'true'
    } else if (this.props.stackOptions && this.props.stackOptions.properties[name].type === 'integer') {
      value = parseInt(value, 10)
    } else if (this.props.stackOptions && this.props.stackOptions.properties[name].type === 'number') {
      value = parseFloat(value)
    }

    this.setState({
      options: Object.assign({}, this.state.options, {
        [name]: {value}
      })
    })
  }

  onMoveOperation (dragIndex, hoverIndex) {
    let { operations, activeOperation } = this.state
    const dragOperation = operations[dragIndex]
    const hoverOperation = operations[hoverIndex]

    if (activeOperation === dragIndex) {
      activeOperation = hoverIndex
    } else if (activeOperation === hoverIndex) {
      activeOperation = dragIndex
    }

    operations[dragIndex] = hoverOperation
    operations[hoverIndex] = dragOperation

    this.setState({
      operations: [...operations],
      activeOperation: activeOperation,
      preview: Object.assign({}, this.state.preview, { updated: false })
    })
  }

  removeOperation (e, index) {
    e.preventDefault()

    const operations = [
      ...this.state.operations.slice(0, index),
      ...this.state.operations.slice(index + 1)
    ]
    this.setState({ operations, preview: Object.assign({}, this.state.preview, { updated: false }) })
  }

  setActiveOperation (e, index) {
    e.preventDefault()

    this.setState({
      activeOperation: index
    })
  }

  updatePreview (previewImage = null) {
    if (!previewImage) {
      return
    }

    const image = new window.Image()
    image.src = rokka.render.getUrl(this.props.auth.organization, previewImage.hash, previewImage.format, this.state.operations)
    image.onload = () => {
      this.setState({
        preview: Object.assign({}, this.state.preview, {
          imageLoading: false
        })
      })
    }
    image.onerror = () => {
      this.setState({
        preview: Object.assign({}, this.state.preview, {
          error: 'Invalid combination of image parameters.',
          imageLoading: false
        })
      })
    }

    this.setState({
      preview: Object.assign({}, this.state.preview, {
        image,
        imageLoading: true,
        updated: true,
        error: null
      })
    })
  }

  render () {
    const error = this.state.error ? <div className="rka-alert is-error mb-lg">{this.state.error}</div> : null

    let $previewButton = null
    if (this.props.previewImage) {
      $previewButton = (
        <button
          type="button"
          href="#"
          onClick={(e) => { e.preventDefault(); this.updatePreview(this.props.previewImage) }}
          disabled={this.state.preview.updated}
          className="rka-button rka-button-secondary mr-md">
          Update preview
        </button>
      )
    }

    return (
      <form onSubmit={this.onSubmit}>
        <div className="bg-white pa-md clearfix">
          <h1 className="rka-h1 flo-l mt-xs">New stack</h1>
          <div className="flo-r">
            {$previewButton}
            <button
              className={cx('rka-button rka-button-brand',
                { 'disabled flo-r': this.state.showLoader || this.state.name === '' })}
              type="submit">
              { this.state.showLoader ? <div className="sk-cube-small sk-cube-white"><Spinner /></div> : 'Create stack' }
            </button>
          </div>
        </div>
        <section className="rka-box rka-box-stacks pt-n">
          {error}
          <div className="row">
            <div className="col-md-7 col-sm-7">
              <h3 className="rka-h2 mv-md">Stack details</h3>
              <FormGroup label="Name" required>
                <input type="text" className="rka-input-txt" id="name" name="name" onChange={this.onChangeName}
                  value={this.state.name} />
              </FormGroup>

              <Options defaultOptions={this.props.stackOptions ? this.props.stackOptions.properties : {}} options={this.state.options} onChange={this.onChangeOptions} stacks={this.props.stacks} />

              <h3 className="rka-h2 mv-md">Operations</h3>
              {this.state.operations.map((operation, index) => {
                return <Operation
                  availableOperations={this.props.operations}
                  key={`operation-${operation.id}-${operation.name}`}
                  operation={operation}
                  index={index}
                  isActive={index === this.state.activeOperation}
                  onChange={this.onChange}
                  removeOperation={this.removeOperation}
                  setActiveOperation={this.setActiveOperation}
                  onMoveOperation={this.onMoveOperation}
                />
              })}

              <div className="pa-md bor-light mt-md">
                <h3 className="rka-h3 mb-md">New operation</h3>
                <div className="rka-form-group">
                  <select ref="operationsList" className="rka-select">
                    {Object.keys(this.props.operations).filter(name => name !== 'noop').sort().map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <a href="#" className="rka-button rka-button-brand rka-button-sm" onClick={this.addOperation}>Add operation</a>
              </div>
            </div>
            {this.renderPreviewSidebar()}
          </div>
        </section>
      </form>
    )
  }

  renderPreviewSidebar () {
    const { previewImage } = this.props
    if (!previewImage) {
      return null
    }

    const { organization } = this.props.auth
    const previewImages = {
      original: rokka.render.getUrl(organization, previewImage.hash, previewImage.format),
      dynamic: this.state.preview.image
        ? this.state.preview.image.src
        : rokka.render.getUrl(organization, previewImage.hash, previewImage.format)
    }

    return (
      <div className="col-md-5 col-sm-5">
        <h3 className="rka-h2 mv-md">
          Preview
          <a href="#" onClick={this.props.onOpenChoosePreviewImage} className="rka-link flo-r txt-sm">
            Change picture
          </a>
        </h3>
        <div className="rka-stack-img-container bg-chess mb-xs bor-light txt-c">
          <p className="pa-md bg-white txt-l">
            Customized <a href={previewImages.dynamic} className="rka-link flo-r" target="_blank">Open in new window</a>
          </p>
          { this.state.preview.error ? <Alert alert={{ type: 'error', message: this.state.preview.error }} /> : null }
          { this.state.preview.imageLoading ? <Spinner /> : <img src={previewImages.dynamic} /> }
        </div>
        <div className="rka-stack-img-container bg-chess bor-light txt-c">
          <p className="pa-md bg-white txt-l">
            Original <a href={previewImages.original} className="rka-link flo-r" target="_blank">Open in new window</a>
          </p>
          <img src={previewImages.original} />
        </div>
      </div>
    )
  }
}
NewStack.propTypes = {
  auth: PropTypes.shape({
    organization: PropTypes.string.isRequired
  }).isRequired,
  stackClone: PropTypes.object,
  operations: PropTypes.object.isRequired,
  stackOptions: PropTypes.object,
  stacks: PropTypes.object,
  router: PropTypes.shape({
    push: PropTypes.func.isRequired
  }).isRequired,
  // from previewImage
  onOpenChoosePreviewImage: PropTypes.func.isRequired,
  loadPreviewImage: PropTypes.func.isRequired,
  previewImage: PropTypes.object
}

export default authRequired(DragDropContext(HTML5Backend)(previewImage(NewStack)))
