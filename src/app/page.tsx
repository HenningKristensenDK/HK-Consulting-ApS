"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPrefs } from "@/lib/preferences";
import Onboarding from "@/components/Onboarding";
import { UserPreferences } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const prefs = getPrefs();
    if (prefs.onboardingComplete) {
      router.replace("/feed");
    } else {
      setNeedsOnboarding(true);
      setChecked(true);
    }
  }, [router]);

  function handleComplete(_prefs: UserPreferences) {
    router.replace("/feed");
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsOnboarding) {
    return <Onboarding onComplete={handleComplete} />;
  }

  return null;
}
