import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import DevicesScreen from '../screens/DevicesScreen';
import DeviceDetailsScreen from '../screens/DeviceDetailsScreen';
import RemoteDashboardScreen from '../screens/RemoteDashboardScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MouseControlScreen from '../screens/MouseControlScreen';
import KeyboardScreen from '../screens/KeyboardScreen';
import SystemMonitorScreen from '../screens/SystemMonitorScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import FileExplorerScreen from '../screens/FileExplorerScreen';
import CodeRunnerScreen from '../screens/CodeRunnerScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Devices" component={DevicesScreen} />
        <Stack.Screen name="DeviceDetails" component={DeviceDetailsScreen} />
        <Stack.Screen name="RemoteDashboard" component={RemoteDashboardScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MouseControl" component={MouseControlScreen} />
        <Stack.Screen name="Keyboard" component={KeyboardScreen} />
        <Stack.Screen name="SystemMonitor" component={SystemMonitorScreen} />
        <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
        <Stack.Screen name="FileExplorer" component={FileExplorerScreen} />
        <Stack.Screen name="CodeRunner" component={CodeRunnerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}