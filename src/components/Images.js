import PropTypes from 'prop-types'
import React, { PureComponent, Fragment } from 'react'
import { authRequired } from '../utils/auth'
import { clearUploadedImages } from '../state'
import BaseLayout from './layouts/BaseLayout'
import ImageList from './images/List'
import UploadImage from './images/Upload'
import { Route } from 'react-router-dom'
import ImageDetail from './ImageDetail'

const ImageListContainer = ({ organization, onClickImage, uploadedImages, deletedImages }) => (
  <Fragment>
    <h1 className="rka-h1 mb-md">Images</h1>
    <UploadImage organization={organization} />
    <section className="rka-section rka-box pa-md mt-md">
      <ImageList
        enableSearch
        onClickImage={onClickImage}
        limit={12}
        enableLoadMore
        organization={organization}
        uploadedImages={uploadedImages}
        deletedImages={deletedImages}
      />
    </section>
  </Fragment>
)
ImageListContainer.propTypes = {
  organization: PropTypes.string.isRequired,
  onClickImage: PropTypes.func.isRequired,
  uploadedImages: PropTypes.array,
  deletedImages: PropTypes.array
}

class Images extends PureComponent {
  constructor() {
    super()

    this.onClickImage = this.onClickImage.bind(this)
  }

  onClickImage(e, image) {
    e.preventDefault()

    this.props.router.history.push(`/images/${image.hash}`)
  }

  componentWillUnmount() {
    clearUploadedImages()
  }

  render() {
    return (
      <BaseLayout {...this.props}>
        <Route
          path="/images"
          exact
          render={() => (
            <ImageListContainer
              organization={this.props.auth.organization}
              onClickImage={this.onClickImage}
              uploadedImages={this.props.uploadedImages}
              deletedImages={this.props.deletedImages}
            />
          )}
        />
        <Route
          path="/images/:hash"
          render={props => <ImageDetail {...{ ...this.props, ...{ router: props } }} />}
        />
      </BaseLayout>
    )
  }
}

Images.propTypes = {
  router: PropTypes.shape({
    history: PropTypes.shape({
      push: PropTypes.func.isRequired
    }).isRequired
  }).isRequired,
  auth: PropTypes.object,
  uploadedImages: PropTypes.array,
  deletedImages: PropTypes.array
}

export default authRequired(Images)
