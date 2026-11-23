'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

import { AccountManagement } from './account-management';
import { DatasheetManagement } from './datasheet-management';

export function SettingsTabs() {
  return (
    <Tabs defaultValue="datasheet" className="gap-5">
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-6 rounded-none border-b border-[#e8eaed] bg-transparent p-0"
      >
        <TabsTrigger
          value="account"
          className="h-auto flex-none rounded-none px-0 pb-3 text-base font-medium text-[#8b8f96] data-active:font-bold data-active:text-[#1f1f1f]"
        >
          계정관리
        </TabsTrigger>
        <TabsTrigger
          value="datasheet"
          className="h-auto flex-none rounded-none px-0 pb-3 text-base font-medium text-[#8b8f96] data-active:font-bold data-active:text-[#1f1f1f]"
        >
          데이터시트관리
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="mt-0 outline-none">
        <AccountManagement />
      </TabsContent>

      <TabsContent value="datasheet" className="mt-0 outline-none">
        <DatasheetManagement />
      </TabsContent>
    </Tabs>
  );
}
