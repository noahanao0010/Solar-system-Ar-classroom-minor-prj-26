import { useState, useEffect, useCallback } from 'react';
import { deviceGyro, GyroOrientationState } from '../utils/deviceOrientation';
import { soundEffects } from '../utils/soundEffects';

export function useGyroscope() {
  const [gyroState, setGyroState] = useState<GyroOrientationState>(() => deviceGyro.getState());

  useEffect(() => {
    const unsubscribe = deviceGyro.subscribe(setGyroState);
    return () => unsubscribe();
  }, []);

  const toggleGyro = useCallback(async () => {
    soundEffects.playClick();
    if (gyroState.isActive) {
      deviceGyro.stopListening();
    } else {
      await deviceGyro.requestEnable();
    }
  }, [gyroState.isActive]);

  const calibrate = useCallback(() => {
    soundEffects.playClick();
    deviceGyro.calibrate();
  }, []);

  const setSensitivity = useCallback((factor: number) => {
    soundEffects.playClick();
    deviceGyro.setSensitivity(factor);
  }, []);

  return {
    ...gyroState,
    toggleGyro,
    calibrate,
    setSensitivity,
  };
}
