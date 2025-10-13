"use client";
import {
	IconBrain,
	IconHome,
	IconListCheck,
	IconSchool,
} from "@tabler/icons-react";
import type { RouteType } from "next/dist/lib/load-custom-routes";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import {
	createContext,
	type Dispatch,
	type SetStateAction,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default function Sidebar() {
	const pathname = usePathname();

	return (
		<div className="top-16 flex h-full divide-x [&>*]:last:border-r">
			<div className="flex h-full w-16 flex-col items-center">
				<div className="flex h-full w-full flex-col items-center justify-between py-4">
					<nav className="flex flex-col items-center gap-4 text-lg">
						<SidebarButton
							icon={<IconHome className="size-4.5" />}
							href="/"
							label="Home"
							isActive={pathname === "/"}
						/>
						<SidebarButton
							icon={<IconSchool className="size-4.5" />}
							href="/classes"
							label="Classes"
							isActive={pathname.startsWith("/classes")}
						/>
						<SidebarButton
							icon={<IconBrain className="size-4.5" />}
							href="/study"
							label="Study"
							isActive={pathname.startsWith("/study")}
						/>
						<SidebarButton
							icon={<IconListCheck className="size-4.5" />}
							href="/todo"
							label="Todo List"
							isActive={pathname.startsWith("/todo")}
						/>
					</nav>
				</div>
			</div>
			{/* <div className="w-12"></div> */}
			<SidebarExtensionSlot />
		</div>
	);
}

export function SidebarButton({
	icon,
	href,
	label,
	isActive = false,
}: {
	icon: React.ReactNode;
	href: LinkProps<RouteType>["href"];
	label: string;
	isActive?: boolean;
}) {
	return (
		<Tooltip delayDuration={1000}>
			<TooltipTrigger asChild>
				<Button
					className={cn(
						"border-0 text-muted-foreground",
						isActive && "border bg-accent/25 text-foreground",
					)}
					size="icon"
					variant="ghost"
					asChild
				>
					<Link prefetch href={href}>
						{icon}
					</Link>
				</Button>
			</TooltipTrigger>
			<TooltipContent className="pointer-events-none" side="right">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

export function SidebarExtension({ children }: { children: React.ReactNode }) {
	const slot = useContext(SidebarExtensionContext);
	if (!slot.current) return null;
	return createPortal(children, slot.current);
}

type SidebarExtensionContextData = {
	current: HTMLElement | null;
	set: Dispatch<SetStateAction<SidebarExtensionContextData>>;
};
const SidebarExtensionContext = createContext<SidebarExtensionContextData>({
	current: null,
	set: () => null,
});

export function SidebarExtensionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [el, setEl] = useState<SidebarExtensionContextData>({
		current: null,
		set: () => null,
	});

	useEffect(() => {
		setEl((prev) => ({ ...prev, set: setEl }));
	}, [setEl]);

	return (
		<SidebarExtensionContext.Provider value={el}>
			{children}
		</SidebarExtensionContext.Provider>
	);
}

function SidebarExtensionSlot() {
	const slot = useContext(SidebarExtensionContext);
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (ref.current) slot.set((prev) => ({ ...prev, current: ref.current }));
	}, [ref.current]);

	return (
		<div
			className={"[&>*]:has-[*]:!border-r [&>*]:!border-r-0 contents"}
			ref={ref}
		/>
	);
}
