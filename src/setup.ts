import { renderer, resolveState } from './renderer';
import * as R from './types';

import { ActionMap, ComponentMap, StyleMap, VariableMap } from './maps';
export { ComponentMap, ActionMap, StyleMap, VariableMap };
export { resolveState, renderer };

export const useStateResolver = resolveState;

export const setupRenderer = (componentMap: R.ComponentMap): void => {
  Object.assign(ComponentMap, componentMap);
};

export type RendererProps = {
  variableMap: R.VariableMap;
  actionMap: R.ActionMap;
  styleMap?: R.StyleMap;
};

type RendererReturn = {
  error?: string;
  renderer?: ({ component, key }: { component: any; key: number }) => any;
};

const isObjectEmpty = (obj: object) => Object.keys(obj).length === 0;

/**
 * Be careful using this hook. It only works because the number of
 * versioned renderers is static. It will break once you change the number of
 * renderers. See https://reactjs.org/docs/hooks-rules.html#only-call-hooks-at-the-top-level
 */
export const useRenderer = (map: RendererProps): RendererReturn => {
  let error: RendererReturn['error'];
  let renderer: RendererReturn['renderer'];

  /* eslint-disable react-hooks/rules-of-hooks */
  if (isObjectEmpty(ComponentMap) || !map) {
    error = 'You must call setupRenderer() before using the renderer hook.';
  } else {
    const { actionMap, variableMap } = map;
    Object.assign(VariableMap, variableMap);
    Object.assign(ActionMap, actionMap);
    map?.styleMap && Object.assign(StyleMap, map.styleMap);
  }
  /* eslint-enable react-hooks/rules-of-hooks */

  return { error, renderer };
};
