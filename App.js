import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, Text, View, Button } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useState } from 'react';



export default function App() {
  const [orientation, setOrientation] = useState(ScreenOrientation.Orientation.PORTRAIT_UP);

  useEffect (()=> {
    //get initial screen orientation
    ScreenOrientation.getOrientationAsync().then((info) => {
      setOrientation(info);
      console.log("Initial orientation:", info );
    });
    //subscribe to future events
    const subscription = ScreenOrientation.addOrientationChangeListener((evt) => {
      setOrientation(evt.orientationInfo.orientation);
      console.log("Orientation changed:", evt.orientationInfo.orientation);
    });
    //unsubscribe when component is unmounted
    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);

    }
  })


  const rotate = () => {
    let newOrientation = orientation;
    let newOrientationLock = ScreenOrientation.OrientationLock.PORTRAIT_UP;
    
    switch (orientation) {
      case ScreenOrientation.Orientation.PORTRAIT_UP:
        newOrientation = ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
        newOrientationLock = ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT;
        break;
      case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
        if (Platform.OS == 'ios') {
          newOrientation = ScreenOrientation.Orientation.LANDSCAPE_LEFT;
          newOrientationLock = ScreenOrientation.OrientationLock.LANDSCAPE_LEFT;
       }
        else {
          newOrientation = ScreenOrientation.Orientation.PORTRAIT_DOWN;
          newOrientationLock = ScreenOrientation.OrientationLock.PORTRAIT_DOWN;
        }
        break;
      case ScreenOrientation.Orientation.PORTRAIT_DOWN:
        newOrientation = ScreenOrientation.Orientation.LANDSCAPE_LEFT;
        newOrientationLock = ScreenOrientation.OrientationLock.LANDSCAPE_LEFT;
        break;
      case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
        newOrientation = ScreenOrientation.Orientation.PORTRAIT_UP;
        newOrientationLock = ScreenOrientation.OrientationLock.PORTRAIT_UP;
        break;
        default:
          console.log("Unknown orientation()");
          
    }
    setOrientation(newOrientation);
    ScreenOrientation.lockAsync(newOrientationLock);
  }
  
  
  return (
    <View style={styles.container}>
      <Text>Current orientation: {orientation}</Text>
      <Button title="Rotate" onPress={rotate} />
      <StatusBar style="auto" />
    </View>
  );

  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1da1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});