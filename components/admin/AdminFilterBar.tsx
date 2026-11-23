"use client";

import type { LucideIcon } from "lucide-react";
import { ListFilter, Search } from "lucide-react";

export interface AdminFilterTab<TValue extends string> {
  value: TValue;
  label: string;
  count: number;
  icon?: LucideIcon;
  activeClassName: string;
  inactiveClassName: string;
  badgeClassName: string;
}

export interface AdminSelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

export interface AdminFilterBarProps<
  TTab extends string,
  TSelect extends string,
> {
  tabs: AdminFilterTab<TTab>[];
  activeTab: TTab;
  onTabChange: (value: TTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  searchPlaceholder: string;
  selectLabel: string;
  selectValue: TSelect;
  selectOptions: AdminSelectOption<TSelect>[];
  onSelectChange: (value: TSelect) => void;
}

export function AdminFilterBar<TTab extends string, TSelect extends string>({
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  selectLabel,
  selectValue,
  selectOptions,
  onSelectChange,
}: AdminFilterBarProps<TTab, TSelect>) {
  return (
    <div className="bg-brand-surface border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-800/80">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive ? tab.activeClassName : tab.inactiveClassName
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-900 ${tab.badgeClassName}`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={onSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-brand-lime transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <ListFilter className="w-4 h-4 text-neutral-400" />
          <span className="text-xs text-neutral-400">{selectLabel}</span>
          <select
            value={selectValue}
            onChange={(e) => onSelectChange(e.target.value as TSelect)}
            className="bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-lime transition-colors cursor-pointer"
          >
            {selectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
