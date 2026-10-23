"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { staffById } from "@/lib/data";
import { StoreProvider, useStore } from "@/lib/store";
import { HousekeeperView } from "./housekeeper";
import { SignOn } from "./sign-on";
import { SupervisorView } from "./supervisor";

export function App() {
	// Render client-only: the demo clock and saved state live in the browser.
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return <div className="min-h-dvh" />;
	return (
		<StoreProvider>
			<MotionConfig reducedMotion="user">
				<Screens />
			</MotionConfig>
			<Toaster
				position="bottom-center"
				richColors
				closeButton={false}
				mobileOffset={{
					bottom: "calc(16px + env(safe-area-inset-bottom))",
				}}
			/>
		</StoreProvider>
	);
}

function Screens() {
	const { state } = useStore();
	const role = staffById(state.user)?.role;
	const key = state.user ?? "sign-on";
	return (
		<AnimatePresence mode="wait" initial={false}>
			<motion.div
				key={key}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
			>
				{!state.user
					? <SignOn />
					: role === "housekeeper"
					? <HousekeeperView me={state.user} />
					: <SupervisorView me={state.user} />}
			</motion.div>
		</AnimatePresence>
	);
}
