import React, { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { PoweredBy } from '../../components';
import { colors } from '../../identity/colors/colors';
import { media } from '../../identity/media/media';
import { spaces } from '../../identity/spaces/spaces';
import { zIndex } from '../../identity/zIndex';

interface SidebarProps {
  active?: boolean;
  children: ReactNode;
}

export function Sidebar({ active = false, children }: SidebarProps) {
  return (
    <StyledNav active={active}>
      <StyledUl>{children}</StyledUl>
      <PoweredBy />
    </StyledNav>
  );
}

interface StyledNavProps {
  active?: boolean;
}

const activeCss = css`
  transform: translateX(0);
  transition: transform 0.4s ease;

  ${media.mobile`width: 100%;`}
`;

const inactiveCss = css`
  ${media.desktop`
    transform: translateX(0);
  `}

  ${media.mobile`
    transform: translateX(-100%);
  `}
`;

const StyledNav = styled.nav<StyledNavProps>`
  position: fixed;
  left: 0;
  bottom: 0;
  top: ${spaces.xlarge};
  width: 13.75rem;
  background: ${colors.gray.sidebar};
  color: ${colors.gray.light};
  transform: translateX(-13.75rem);
  transition: transform 0.4s ease;
  z-index: ${zIndex.sidebar};

  ${({ active }) => (active ? activeCss : inactiveCss)}
`;

const StyledUl = styled.ul`
  margin: 0;
  padding: 0;

  > li {
    list-style: none;
  }
`;
