"use client";

import { IconCheck } from "@tabler/icons-react";
import { notFound } from "next/navigation";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { useState } from "react";
import { useControlledState } from "@/hooks/use-controlled-state";
import { cn } from "@/lib/utils";
import styles from "../todo/checkbox.module.css";

export default function TestPage() {
	if (process.env.NODE_ENV === "production") notFound();

	return (
		<div className="flex size-full flex-col items-center justify-center gap-24">
			<div className="scale-100">
				<AnimatedCheckbox />
				<Checkbox />
			</div>
		</div>
	);
}

function AnimatedCheckbox() {
	const [checked, setChecked] = useState(false);
	return (
		<div className="relative size-5">
			<div
				className={cn(
					"pointer-events-none absolute size-full rounded-[5px] outline-0 outline-primary transition-[outline]",
					checked && styles.checkboxBg,
				)}
			/>
			<div
				onClick={() => {
					setChecked((prev) => !prev);
				}}
				className={cn(
					"absolute flex size-full cursor-pointer items-center justify-center rounded-[5px] border border-input transition-[background,border] dark:bg-input/30",
					checked && "border-primary bg-primary dark:bg-primary",
				)}
			>
				<IconCheck
					pathLength={100}
					style={{
						strokeDasharray: 100,
						strokeDashoffset: checked ? 0 : 100,
					}}
					className={cn(
						"size-4 text-primary-foreground transition-[stroke-dashoffset] duration-100",
						checked && "duration-1000",
					)}
				/>
			</div>
		</div>
	);
}

function Checkbox({
	className,
	checked: checkedInput,
	onCheckedChange,
	withBorder = false,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
	withBorder?: boolean;
}) {
	const [checked, setChecked] =
		useControlledState<CheckboxPrimitive.CheckedState>({
			defaultValue: false,
			value: checkedInput,
			onChange: onCheckedChange,
		});

	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"flex size-5 cursor-pointer items-center justify-center rounded-[5px] border border-input shadow-xs transition-[background,border,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:data-[state=checked]:bg-primary dark:aria-invalid:ring-destructive/40",
				checked === true && withBorder ? styles.checkboxBg : undefined,
				className,
			)}
			checked={checked}
			onCheckedChange={setChecked}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				forceMount
				data-slot="checkbox-indicator"
				className="flex items-center justify-center text-current"
			>
				<IconCheck
					pathLength={100}
					style={{
						strokeDasharray: 100,
						strokeDashoffset: checked !== false ? 0 : 100,
					}}
					className={cn(
						"size-4 text-primary-foreground transition-[stroke-dashoffset] duration-100",
						checked === true && "duration-1000",
					)}
				/>
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}
