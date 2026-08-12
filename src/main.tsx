import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import type { PiCitySceneProps } from './world/PiCityScene';
import './styles.css';

const SceneOverride = (window as typeof window & {
  __PI_CITY_SCENE_OVERRIDE__?: React.ComponentType<PiCitySceneProps>;
}).__PI_CITY_SCENE_OVERRIDE__;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App SceneComponent={SceneOverride} />
  </React.StrictMode>,
);
