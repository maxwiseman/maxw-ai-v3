import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: ComponentProps<"svg">) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			// width={78}
			// height={32}
			viewBox="0 0 78 32"
			fill="none"
			className={cn("grayscale", className)}
			{...props}
		>
			<path
				fill="#FF7A00"
				d="M55.5 0h22l-19 32h-22l19-32Z"
				className="ccustom"
			/>
			<path
				fill="#FF9736"
				d="M35.5 0h16l-19 32h-16l19-32Z"
				className="ccompli1"
			/>
			<path
				fill="#FFBC7D"
				d="M19.5 0h12l-19 32H.5l19-32Z"
				className="ccompli2"
			/>
		</svg>
	);
}
