import { shallow } from 'enzyme';
import React from 'react';

import { FormGroup } from './formGroup';
import { Input } from '../../elements/input/input';

describe('Components', () => {
  describe('FormGroup', () => {
    it('renders a form group correctly.', () => {
      const component = shallow(
        <FormGroup label="Label for input">
          <Input placeholder="A placeholder" />
        </FormGroup>
      );

      expect(component).toMatchSnapshot();
    });
  });
});