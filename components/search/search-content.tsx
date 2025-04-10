'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/ui/icons';

export default function SearchContent() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs defaultValue="people" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="people" className="flex items-center gap-2">
            <Icons.users className="h-4 w-4" />
            People
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <span className="text-lg">#</span>
            Tags
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <Icons.messageCircle className="h-4 w-4" />
            Posts
          </TabsTrigger>
        </TabsList>

        <div className="mb-6">
          <Input
            type="search"
            placeholder="Search for users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xl"
          />
        </div>

        <TabsContent value="people">
          {/* Add people search results here */}
          <div className="text-center text-muted-foreground">
            Search for people to connect with
          </div>
        </TabsContent>

        <TabsContent value="tags">
          {/* Add tags search results here */}
          <div className="text-center text-muted-foreground">
            Search for tags to discover content
          </div>
        </TabsContent>

        <TabsContent value="posts">
          {/* Add posts search results here */}
          <div className="text-center text-muted-foreground">
            Search for posts by content
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 