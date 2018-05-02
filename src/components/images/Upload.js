import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import Dropzone from 'react-dropzone'
import Promise from 'bluebird'
import rokka from '../../rokka'
import { updateUploadedImages } from '../../state'
import uploadIcon from '../../img/upload-icon.svg'

const UPLOAD_DEFAULT = 0
const UPLOAD_PENDING = 1
const UPLOAD_SUCCESSFUL = 2
const UPLOAD_ERROR = 3

class UploadImage extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      upload: UPLOAD_DEFAULT,
      images: []
    }
  }

  onDrop (files) {
    this.setState({ upload: UPLOAD_PENDING })

    const mapFile = (file) => {
      const fileReader = new window.FileReader()

      let idx = -1

      fileReader.onload = (e) => {
        const images = [...this.state.images, {
          url: e.target.result,
          name: file.name,
          uploaded: false
        }]
        idx = images.length - 1
        this.setState({
          images: images
        })
      }
      fileReader.readAsDataURL(file)

      return rokka.sourceimages.create(this.props.organization, file.name, file)
        .then(({ body }) => {
          const images = [...this.state.images]

          const item = body.items[0]
          images[idx] = Object.assign(item, {
            uploaded: true,
            url: rokka.render.getUrl(this.props.organization, item.hash, item.format, 'dynamic/noop')
          })
          this.setState({images: images})
          updateUploadedImages(images)
        })
        .catch((err) => {
          console.error(err)
        })
    }

    Promise.map(files, mapFile, {concurrency: 5})
      .then(() => {
        this.setState({ upload: UPLOAD_SUCCESSFUL })
      })
      .catch((err) => {
        this.setState({ upload: UPLOAD_ERROR })
        console.error(err)
      })
  }

  onClick (e) {
    e.preventDefault()

    this.refs.dropzone.open()
  }

  render () {
    let $banner = null

    if (this.state.upload === UPLOAD_PENDING) {
      $banner = <div className="rka-alert txt-c mt-md is-pending">Uploading...</div>
    } else if (this.state.upload === UPLOAD_SUCCESSFUL) {
      $banner = <div className="rka-alert txt-c mt-md is-success">Upload successful</div>
    } else if (this.state.upload === UPLOAD_ERROR) {
      $banner = <div className="rka-alert txt-c mt-md is-error">Upload failed</div>
    }

    return (
      <div>
        <Dropzone onDrop={(files) => this.onDrop(files)} className="rka-uploader" activeClassName="rka-uploader is-active"
          ref="dropzone" disableClick>
          <div className="rka-uploader-hd">
            <svg className="rka-uploader-icon">
              <use xlinkHref={uploadIcon + '#upload'} />
            </svg>
            <div className="visible-md-block">
              <p className="mt-sm">Drop your images</p>
              <p className="mt-sm">or</p>
            </div>
          </div>
          <button className="rka-button rka-button-brand" onClick={(e) => this.onClick(e)}>Browse images</button>
        </Dropzone>
        {$banner}
      </div>
    )
  }
}

UploadImage.propTypes = {
  organization: PropTypes.string.isRequired
}

export default UploadImage
