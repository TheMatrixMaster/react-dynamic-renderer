# react-dynamic-renderer
**Dynamic JSON schema to ReactJS component renderer**

This package was created to support dynamic rendering of React components from a universal JSON schema template that can be versioned and served from your backend of choice. This package supports both React and React Native components out of the box, and provides the core JSON to React translator equipped with many of the React staples such as component state management, component props, hooks, actions, and styling. The core idea is that given a valid JSON schema, the translator will pull in the correct components, style them according to the specification, and pass in the appropriate props, handles, and callbacks for fully dynamic functionality. 

## JSON Schema Language

Let's first take a look at what a valid JSON schema looks like. Here I've provided an example JSON schema for a `TextComponent` that we will soon render in ReactJS.
```json
{
  "type": "textComponent",
  "style": {
    "marginTop": 5,
  },
  "props": {
    "label": "Hello world!",
    "onPress": {
      "name": "popNavigation",
    }
  }
}
```

### Type
The `type` key is the most straightforward. It is a unique string identifier that maps the UI object to the appropriate React component on the frontend. This is accomplished through a common key to component index object that is statically declared on the frontend:
```typescript
const keysToComponentMap = {
  view: View,
  text: Comp.Text,
  ...
};
```

### Style
The `style` key enables us to style the React component on the frontend through the JSON schema. This key holds an immutable styling object that is directly fed to the component as a style prop as shown below.
```jsx
<Text style={{fontSize: 28, lineHeight: 30, fontFamily: "latoBold", marginBottom: 2}} />
```

### Props
Some React components require props to be appropriately rendered. This key enables us to pass those props in a non-static manner. In most cases, this is where we will pass dynamically declared variables to the component. For instance, imagine that you want to render a text component that dynamically displays the a mutable `response` variable that the user can modify. Then, you will reference that `response` variable inside the `props` object under the same property key name as your frontend component. Let's write an example:
```json
{
  "type": "text",
  "props": {
    "space": 1,
    "label": [
      {
        "root": "@state",
        "keys": "response"
      }
    ]
  }
}
```
will map the appropriate state.response variable into
```jsx
<Text space={1} label={state.response} />
```
Notice that `props` also accepts static variables (ex: `space: 1`) that are directly fed to the component.
For more information about the referencing of dynamic variables, please consult `Referencing Variables`.

### Children
React syntax, mirroring simple HTML, allows components to be nested inside one another. This is a crucial functionality that allows UI elements to exist in a parent/child environment. Our JSON schema enables this logic through the `children` key. This key holds a simple array that works identically to the `section` key described above. The array contains an arbitrary number of UI objects that also follow the standard UI object structure & properties described above. Here is an example for a `View` component that contains a `Text` component.
```json
{
  "type": "view",
  "children": [
    {
      "type": "text",
      "props": {
        "label": "Example"
      }
    }
  ]
}
```
gets translated to
```jsx
<View>
  <Text label={'Example'} />
<View />
```

## Dispatching Actions
Apart from displaying React components, the schema needs to enable users to interact with the interface through buttons, dragging, sliding, etc that trigger the appropriate actions. For example, a slider component needs to trigger the appropriate action to mutate the corresponding response variable in state. To accomplish this feat, we have designed a simple JSON to Javascript representation that dispatches the appropriate actions when users interact with React components. 

In the JSON representation, an action for setting the React state by pressing a button looks like this:
```json
$ As a general rule of thumb, actions are declared as a prop under the `props` key of a UI object
{
  "type": "button",
  "props": {
    "onPress": {
      "name": "setState",
      "key": "response",
      "value": 9
    }
  }
}
```
`name` is a required key that serves as a unique identifier for actions. It is used on the frontend to parse the JSON representation and output the appropriate javascript action.

Other variables in the action payload, that we refer to as `arguments`, are provided on a case-specific basis and do not generalize across actions. In the current example, the `key` variable specifies which key should be modified inside the React state and the `value` variable is the newly desired key value. This logic is handled on the frontend inside the `dispatchAction` function as follows:
```jsx
const dispatchAction = (action, val = null) => {
  if (!action) return null;
  switch (action.name) {
    case 'setState':
      // sets state with [action.key]: val
      return setState({...state, [action.key]: val});
    ...
  }
}
```
This `dispatchAction` function is then statically associated to the `button` component type inside the chief `renderer` function like so:
```jsx
const renderer = (c) => {
  const p = c.props;
  ...
  if (c.type === 'button')
    cProps = {onPress: () => dispatchAction(p.onPress, p.onPress.value)};
  ...
  return React.createElement(...);
}
```
It is important to note that the example provided above does not adequately reflect the parsing process for other actions. In fact, each action has a statically declared equivalent inside the `dispatchAction` and `renderer` functions that parse and return the corresponding Javascript function from the `arguments` provided inside the JSON. In this sense, our algorithm for dispatching actions is not as dynamic as we would want it to be. Indeed, if we want to declare new actions or if we decide to add/remove arguments from the JSON payload, these would most likely break the frontend and wouldn't be appropriately handled inside the static `dispatchAction` function. Therefore, this section is to be improved as soon as possible.

## Referencing Variables
Now that we have covered the declaration of variables and actions, we need to tackle the referencing of variables through our JSON schema. For static variables, this is unnecessary because we can simply hardcode the desired value inside our schema. However, for dynamic variables, we need a common referencing algorithm that will convert our JSON representation into the desired javascript variable on the frontend. This is how we have accomplished this:

In the JSON representation, a variable reference looks like this:
```json
$ reminder: dynamic variables are almost always referenced inside the `props` key of the UI object
{
  "type": "text",
  "props": {
    "label": [
      {
        "root": "@props",
        "keys": "provider.first_name",
        "default": "John",
        "suffix": " "
      },
      {
        "root": "@props",
        "keys": "provider.last_name",
        "default": "Doe"
      }
    ]
  }
}
```

### Parent Structure and Nesting
The parent structure of our JSON reference is a 1D array that contains an arbitrary number of pure objects that we will call `variable object` or `VO`. Each VO is an independent entity that references a specific Javascript variable on the frontend. As seen in the example above, VOs can be chained together to access deeply nested variables or to concatenate strings variables. As a general rule of thumb, most variable processing should be performed on the backend before sending such payloads to the frontend. This limits the amount of dynamic processing tasks that the frontend needs to perform before using a referenced variable. However, basic processing such as string concatenation and handling deeply nested values should and are supported on the frontend.

### Variable Objects (VOs)
All variable objects follow a unique and reproducible structure and contain the following properties:
* `root` (required): this key refers to the parent object on the frontend that contains the variable that we desire to retrieve. As of now, root accepts 4 distinct values: `@state`, `@variables`, `@props`, `@env`. Respectively, these refer to `frontend.state`, `backend.variables`, the React component props (passed statically on frontend), and the environment variables defined in the .env file.
* `keys` (required): this key serves as a string path that gets the value of the path inside the `root` object. This is performed on the frontend through lodash's `get(object, path)` function.
* `default` (optional): this key is quite straightforward. It enables us to provide a default static value for the referenced variable if the lodash get() command returns an `undefined` or response.

The three properties described above are handled on the frontend as follows:
```jsx
// for each level of the variable schema,
// deconstruct and extract corresponding local var
let body;
if (level.root === '@state')
  body = level.hasOwnProperty('keys')
    ? get(state, level.keys, level.default) || level.default
    : state;
else if (level.root === '@props')
  body = get(props, level.keys, level.default) || level.default;
else if (level.root === '@variables')
  body = get(variables, level.keys, level.default) || level.default;
else if (level.root === '@env')
  body = get({SERVER}, level.keys, level.default) || level.default;
else if (level.root === null) body = level.keys;
else body = null;
```

* `prefix` (optional): This key is only available for string variables. It allows us to add a static string at the beginning of our referenced variable that gets concatenated on the frontend. This is useful for adding little keywords or for adding spaces in between concatenated strings.
* `suffix` (optional): Same concept as `prefix` except that the static string is added at the end of the referenced variable.

The handling of these string operations are as follows on the frontend:
```jsx
# if the schema specifies a string prefix or suffix, append it here
if (typeof body === 'string') {
  level?.prefix && (body = level.prefix + body);
  level?.suffix && (body = body + level.suffix);
}
```

All this being said, let's walk through the example outlined above:
1. The first VO has `root: "@props"` and `keys: "provider.first_name"`. Therefore, it will search for `props.provider.first_name` on the frontend and return the corresponding value. Notice also that the default placeholder is set to `John` if the referenced value is undefined.
2. Next, the second VO has `root: "@props"` and `keys: "provider.last_name"`. Similarly, it will search for `props.provider.last_name` and return the corresponding value.
3. Finally, the frontend will recognize that both VOs returned strings so it will automatically concatenate them. This is why we added a `suffix: " "` to the first VO in order to properly syntax our response.

## Setup
Add a call to `setupRenderer` in your project's `index.js`:

```jsx
import { setupRenderer } from "@heroai-team/api/dist/src/rendering";

// import the react components that you want to
// dynamically render from the schema
import { MyComponent, ... } from 'path.to.components';

setupRenderer({
  myComponent: {
    element: MyComponent,
    transform: ({
      component,
      parseDynAction,
      parseDynVariable,
      parseDynStyle,
      renderer
    }) => {
      // compute derived props
      const parsedProps = {
        // parseDynVariable will resolve a DynamicVariable type
        label: parseDynVariable(component.props.label),
        // parseDynAction will resolve a DynamicAction type
        onPress: () => parseDynAction(component.props.onPress),
        // renderer is an instance of main renderer. You can use it to render child components
        subtitle: () => renderer({ component: component.props.subtitle }),
      }

      return { parsedProps, useStyle: boolean };
    }
  },
  ...
})
```

To use the renderer in your project, you need to call the `useRenderer`
hook inside your React component and provide the desired renderer config
parameters:

```jsx
import React from 'react';
import { SERVER } from '@env';
import { useRenderer } from "@heroai-team/api/dist/src/rendering";

const MyReactFunction = (props) => {
  // retrieve the styling variables that I want to use
  const colors = {
    white: '#fff',
    black: '#000',
    ...
  }
  const fontFamilies = {
    comfortaa: 'font.asset',
    lato: 'font.asset',
    ...
  }
  const dimensions = {
    screenHeight: 300,
    screenWidth: 100,
  }

  // retrieve the variables that I want to use
  const [state, setState] = React.useState({});
  const variables = props.important.variables;

  // declare the useRenderer hook
  const renderer = useRenderer({
    styleMap: {
      colors,
      dimensions,
      fontFamilies,
    },
    variableMap: {
      state,
      props,
      variables,
      env: { serverURL: SERVER },
    },
    actionMap: {
      setState: ({ action }) => setState({ ...state, [action.payload.key]: value }),
      popNavigation: () => props.navigation.pop(),
      handleURL: ({ action, parseDynVariable }) => {
        const url = parseDynVariable(action.payload.link);
        return openURL(url);
      }
    },
  })

  // let's render MyComponent defined above
  const TextComponent = {
    type: "myComponent",
    style: {
      "marginTop": 5,
    },
    props: {
      label: "Hello world!",
      onPress: {
        name: "popNavigation",
      }
    }
  }

  return renderer(TextComponent);
}
```
