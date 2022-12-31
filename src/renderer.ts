/* eslint-disable react/display-name */

import React, { CSSProperties } from 'react';

import * as R from './types';
import { get, getTime } from './utils';
import { format as timeAgo } from 'timeago.js/lib/format';

import { ComponentMap, StyleMap, VariableMap, ActionMap } from './maps';

const instanceOfSelector = <selectorType extends string>(
  object: any
): object is R.DynamicSelector => {
  if (typeof object !== 'object' || object === null) return false;
  return 'root' in object && 'keys' in object;
};

const isDynamicVariable = (dynVariable: any) =>
  dynVariable &&
  Array.isArray(dynVariable) &&
  dynVariable.length > 0 &&
  dynVariable.every(dynVar =>
    instanceOfSelector<R.VariableSelectorType>(dynVar)
  );

export const resolveState = (
  state?: Record<string, R.DynamicVariable | any>
) => {
  if (!state) return {};
  const finalState = {};

  Object.keys(state).forEach(key => {
    if (isDynamicVariable(state[key])) {
      finalState[key] = parseDynVariable(state[key]);
    } else finalState[key] = state[key];
  });

  return finalState;
};

export const parseDynStyle = (dynamicStyle: R.DynamicStyle): CSSProperties => {
  // handle style transfer
  const finalStyle = {} as CSSProperties;

  for (const [key, value] of Object.entries(dynamicStyle)) {
    if (instanceOfSelector<R.StyleSelectorType>(value)) {
      let body = value?.default ?? value;
      const { root, keys } = value;

      if (root in Object.keys(StyleMap)) {
        body = get({ value: StyleMap[body], path: keys });
      }

      finalStyle[key] = body;
    }
  }

  return finalStyle;
};

export const parseDynVariable = (dynamicVariable: R.DynamicVariable): any => {
  if (!isDynamicVariable(dynamicVariable)) return dynamicVariable;

  const varArray: Array<any> = [];
  let obj: object | null = null;

  dynamicVariable.forEach((level: R.DynamicSelector) => {
    // verify that the level is an appropriate selector type
    if (!instanceOfSelector<R.VariableSelectorType>(level))
      throw new Error(
        `Could not resolve the following variable: ${level}. Missing "root" or "keys" properties.`
      );

    // for each level of the variable schema,
    // deconstruct and extract corresponding local var
    const path = level.keys;
    const def = level.default;

    let body = (() => {
      if (level.root in VariableMap) {
        const hasKeys = Object.prototype.hasOwnProperty.call(level, 'keys');
        if (hasKeys)
          return get({ value: VariableMap[level.root], path, def }) ?? def;
        else if (def) return def;
        else return VariableMap[level.root];
      } else if (level.root === null) return path;
      else return null;
    })();

    // if the schema specifies a string prefix or suffix, or time formatting, do it here
    if (typeof body === 'string' || typeof body === 'number') {
      if (level.format) {
        level.format === 'time' && (body = getTime(body));
        level.format === 'timeago' && (body = timeAgo(Date.parse(body)));
        level.format === 'toInt' && (body = parseInt(body, 10));
        level.format === 'toString' && (body = body.toString());
      }

      level?.prefix && (body = level.prefix + body);
      level?.suffix && (body = body + level.suffix);
    }

    // (A) if the extracted var is an object, store temporarily for further extraction
    if (typeof body === 'object' && body !== null) obj = body;
    // run if extracted var is primitive type
    else if (typeof body !== 'object' && body !== null) {
      if (obj) {
        // if there is currently an stored object from (A),
        // extract new var using indexing
        const res = get({ value: obj, path: body, def: obj });
        // if the newly extracted var is still an object, save for further processing
        if (typeof res === 'object' && res !== null) obj = res;
        else if (res) {
          // if the newly extracted var is primitive, store it in the final varArray
          varArray.push(res);
          obj = null; // reset the object store
        }
      } else {
        varArray.push(body); // push primitive var to final array if is no stored obj
      }
    }
  });

  // if any obj still exists, add to final varArray
  if (obj) {
    varArray.push(obj);
  }

  if (varArray.length > 1) {
    // if final varArray has multiple primitive values, join
    return varArray.join('');
  }

  // return first index if there is only one final item
  return varArray[0];
};

export const parseDynAction = (
  dynamicAction: R.DynamicAction
): CallableFunction => {
  if (dynamicAction.name in ActionMap) {
    return ActionMap[dynamicAction.name]({
      dynamicAction: dynamicAction,
      parseDynVariable: parseDynVariable,
      parseDynAction: parseDynAction,
    });
  }
  return () => null;
};

export const renderer = <componentName extends keyof R.ComponentMap>({
  component,
  key,
}: {
  component: R.Component<componentName>;
  key?: string | number;
}) => {
  const map = ComponentMap[component.type as componentName];

  if (typeof map !== 'undefined') {
    // decompose the component object
    // IMPORTANT: props are now 1st level [key, value] pairs
    const { type, style, children, ...originalProps } = component;

    // process the component's style using the applyStyle() func
    let xStyle: CSSProperties | undefined;
    if (style !== undefined) xStyle = parseDynStyle(style);

    // this obj contains all custom props that
    // need manual processing before rendering
    const { parsedProps } = map.transform({
      props: originalProps,
      component,
      parseDynAction,
      parseDynVariable,
      parseDynStyle,
      renderer,
    });

    return React.createElement(
      map.element,
      // props and styles are merged into one comprehensive object
      Object.assign(
        {},
        originalProps,
        xStyle && { style: xStyle },
        parsedProps,
        { key }
      ),
      children &&
        // children are rendered inside parent component using nested func call
        children.map((childComponent, key) =>
          renderer({ component: childComponent, key })
        )
    );
  }
};
