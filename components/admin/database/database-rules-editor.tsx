'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';

export default function DatabaseRulesEditor() {
  const [rules, setRules] = useState('');
  const [selectedTab, setSelectedTab] = useState('editor');

  const handleSave = async () => {
    // TODO: Implement saving rules to Firebase
    console.log('Saving rules:', rules);
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="editor" className="w-full" onValueChange={setSelectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <Icons.code className="h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <Icons.book className="h-4 w-4" />
            Guide
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Icons.history className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <Card>
            <CardHeader>
              <CardTitle>Rules Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="Enter your database rules here..."
                  className="min-h-[400px] font-mono"
                />
                <Button onClick={handleSave}>
                  <Icons.save className="h-4 w-4 mr-2" />
                  Save Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle>Rules Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert">
                <h3>Writing Secure Rules</h3>
                <p>
                  Database rules determine who has read and write access to your data. Here are some best
                  practices:
                </p>
                <ul>
                  <li>Always start with denying all access</li>
                  <li>Grant access only to authenticated users when needed</li>
                  <li>Use data validation to ensure data integrity</li>
                  <li>Test your rules thoroughly before deploying</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Rules History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                No rule changes have been made yet
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 