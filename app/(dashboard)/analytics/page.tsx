'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Analytics</h1><p className="text-neutral-400 text-sm mt-1">Platform-wide analytics and insights</p></div>
      <Card className="bg-neutral-900/80 border-neutral-800/50">
        <CardContent className="py-16 text-center">
          <BarChart3 className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">Advanced analytics with charts coming soon</p>
          <p className="text-xs text-neutral-600 mt-2">Revenue trends, user growth, subscription distribution, and more</p>
        </CardContent>
      </Card>
    </div>
  );
}
