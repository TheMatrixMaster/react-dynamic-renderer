import * as React from 'react';

export type StyleSelectorType = 'dimensions' | 'colors' | 'fonts' | string;

export type VariableSelectorType = '@state' | '@props' | '@variables' | '@env';

export type ActionSelectorType =
  | 'setState'
  | 'continue'
  | 'back'
  | 'sendSuccess'
  | 'handleURL'
  | 'joinMeeting'
  | 'cancelMeeting'
  | string;

export type DynamicSelector = {
  root: VariableSelectorType;
  keys: string;
  default?: any;
  prefix?: string;
  suffix?: string;
  format?: 'time' | 'timeago' | 'toString' | 'toInt';
};

export type DynamicStyle = {
  [property: string]: StyleSheet | CSSStyleSheet | DynamicSelector;
};

export type DynamicVariable = DynamicSelector[];

export type DynamicAction = {
  name: ActionSelectorType;
  payload?: { [key: string]: any };
  onSuccess?: DynamicAction;
  [other: string]: any;
};

export type StyleMap = {
  [key: StyleSelectorType]: Record<string, any>;
};

export type VariableMap = {
  [variable in VariableSelectorType]: Record<string, any>;
};

export type ActionMap = {
  [action in ActionSelectorType]: ({
    dynamicAction,
    parseDynVariable,
    parseDynAction,
  }: {
    dynamicAction: DynamicAction;
    parseDynVariable: (dynamicVariable: DynamicVariable) => any;
    parseDynAction: (dynamicAction: DynamicAction) => CallableFunction;
  }) => CallableFunction;
};

export type ComponentMap = {
  [componentName in string]: {
    element: React.FunctionComponent<any> | React.ComponentClass<any>;
    transform: ({
      props,
      component,
      parseDynAction,
      parseDynVariable,
      parseDynStyle,
      renderer,
    }: {
      component: Component<string>;
      props: Omit<Component<string>, 'type' | 'children' | 'style'>;
      parseDynAction: (dynamicAction: any) => CallableFunction;
      parseDynVariable: <type>(dynamicVariable: any) => type;
      parseDynStyle: (dynamicStyle: DynamicStyle) => React.CSSProperties;
      renderer: Renderer;
    }) => {
      parsedProps: Partial<Component<string>>;
      useStyle?: boolean;
    };
  };
};

export type Component<type extends string> = {
  type: type;
  style?: DynamicStyle;
  children?: Component<string>[];
} & Record<string, any>;

export type Renderer = ({
  component,
  key,
}: {
  component: Component<string>;
  key?: string | number;
}) => React.ReactElement<any, string | React.JSXElementConstructor<any>>;
