import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href={{ pathname: "/(tabs)/camera" as const }} />;
} 