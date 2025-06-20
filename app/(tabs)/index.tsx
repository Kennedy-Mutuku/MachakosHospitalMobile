import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FeedbackScreen from '../../screens/FeedbackScreen';
import AphiaOneScreen from '../../screens/AphiaOneScreen';
import CommunityScreen from '../../screens/CommunityScreen';

const Tab = createBottomTabNavigator();

export default function TabLayout() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feedback" component={FeedbackScreen} />
      <Tab.Screen name="AphiaOne" component={AphiaOneScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
    </Tab.Navigator>
  );
}
