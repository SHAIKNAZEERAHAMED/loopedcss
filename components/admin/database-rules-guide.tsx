"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Info, ShieldAlert, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism"

const securityRules = `{
  "rules": {
    ".read": false,
    ".write": false,
    
    "users": {
      "$uid": {
        // Users can read and write their own data
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        
        "status": {
          ".read": "auth !== null", // Any authenticated user can see online status
          ".write": "$uid === auth.uid" // Only the user can update their status
        },
        
        "profile": {
          ".read": "auth !== null", // Any authenticated user can read profiles
          ".write": "$uid === auth.uid" // Only the user can update their profile
        },
        
        "posts": {
          ".indexOn": [".value"], // Index for faster querying
          ".read": "auth !== null",
          ".write": "$uid === auth.uid"
        },
        
        "notifications": {
          ".read": "$uid === auth.uid",
          ".write": "auth !== null" // Allow other users to create notifications
        },
        
        "chats": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    },
    
    "posts": {
      ".read": "auth !== null",
      ".write": "auth !== null",
      ".indexOn": ["createdAt", "authorId"],
      
      "$postId": {
        ".validate": "newData.hasChildren(['authorId', 'content', 'createdAt'])",
        "authorId": {
          ".validate": "newData.val() === auth.uid"
        },
        "likes": {
          "$uid": {
            ".write": "auth !== null"
          }
        },
        "comments": {
          ".indexOn": ["createdAt"],
          "$commentId": {
            ".validate": "newData.hasChildren(['authorId', 'content', 'createdAt'])",
            "authorId": {
              ".validate": "newData.val() === auth.uid"
            }
          }
        }
      }
    },
    
    "loops": {
      ".read": "auth !== null",
      ".write": "auth !== null",
      ".indexOn": ["category", "memberCount"],
      
      "$loopId": {
        "posts": {
          ".indexOn": ["createdAt"]
        },
        "members": {
          ".indexOn": [".value"]
        }
      }
    },
    
    "chats": {
      "$chatId": {
        ".read": "data.child('participants').hasChild(auth.uid)",
        ".write": "data.child('participants').hasChild(auth.uid) || newData.child('participants').hasChild(auth.uid)",
        
        "messages": {
          ".indexOn": ["timestamp"],
          "$messageId": {
            ".validate": "newData.hasChildren(['senderId', 'text', 'timestamp'])",
            "senderId": {
              ".validate": "newData.val() === auth.uid"
            }
          }
        }
      }
    },
    
    "moderation-logs": {
      ".read": "root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'moderator'",
      ".write": "auth !== null"
    },

    "indices": {
      ".read": false,
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    }
  }
}`

const recommendedIndexes = `"indices": {
  "posts_by_createdAt": {
    ".value": "posts",
    ".indexOn": ["createdAt"]
  },
  "posts_by_authorId": {
    ".value": "posts",
    ".indexOn": ["authorId"]
  },
  "loops_by_category": {
    ".value": "loops",
    ".indexOn": ["category"]
  },
  "loops_by_memberCount": {
    ".value": "loops",
    ".indexOn": ["memberCount"]
  },
  "user_posts": {
    ".value": "users/$uid/posts",
    ".indexOn": [".value"]
  },
  "chat_messages_by_timestamp": {
    ".value": "chats/$chatId/messages",
    ".indexOn": ["timestamp"]
  }
}`

export default function DatabaseRulesGuide() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Firebase Realtime Database Rules</AlertTitle>
        <AlertDescription>
          Properly configured database rules are essential for security, performance, and ensuring your application
          works correctly.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="security">
        <TabsList>
          <TabsTrigger value="security">Security Rules</TabsTrigger>
          <TabsTrigger value="indexing">Indexing</TabsTrigger>
          <TabsTrigger value="validation">Data Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Rules</CardTitle>
              <CardDescription>
                Use these rules to secure your Realtime Database while allowing proper access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <ShieldAlert className="h-4 w-4 text-amber-800" />
                <AlertTitle>Important Security Notice</AlertTitle>
                <AlertDescription>
                  Never use <code className="bg-amber-100 px-1 py-0.5 rounded">".read": true</code> or{" "}
                  <code className="bg-amber-100 px-1 py-0.5 rounded">".write": true</code> in production, as this grants
                  unrestricted access to your database.
                </AlertDescription>
              </Alert>

              <div className="relative">
                <Button
                  className="absolute top-2 right-2 z-10"
                  size="sm"
                  onClick={() => copyToClipboard(securityRules)}
                >
                  Copy
                </Button>
                <SyntaxHighlighter
                  language="json"
                  style={nightOwl}
                  showLineNumbers={true}
                  customStyle={{ borderRadius: "0.5rem" }}
                >
                  {securityRules}
                </SyntaxHighlighter>
              </div>

              <Alert className="bg-green-50 border-green-200 text-green-800">
                <ShieldCheck className="h-4 w-4 text-green-800" />
                <AlertTitle>Applying These Rules</AlertTitle>
                <AlertDescription>
                  Apply these rules in the Firebase Console: Database → Rules tab. These rules balance security with the
                  functionality needed for Loop(CSS).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indexing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Indexing</CardTitle>
              <CardDescription>Proper indexing is crucial for query performance and avoiding warnings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <ShieldAlert className="h-4 w-4 text-amber-800" />
                <AlertTitle>Index Warning</AlertTitle>
                <AlertDescription>
                  Without indexes, queries using{" "}
                  <code className="bg-amber-100 px-1 py-0.5 rounded">orderByChild()</code> will be slow and may cause
                  errors or warnings.
                </AlertDescription>
              </Alert>

              <div className="relative">
                <Button
                  className="absolute top-2 right-2 z-10"
                  size="sm"
                  onClick={() => copyToClipboard(recommendedIndexes)}
                >
                  Copy
                </Button>
                <SyntaxHighlighter
                  language="json"
                  style={nightOwl}
                  showLineNumbers={true}
                  customStyle={{ borderRadius: "0.5rem" }}
                >
                  {recommendedIndexes}
                </SyntaxHighlighter>
              </div>

              <Alert className="bg-green-50 border-green-200 text-green-800">
                <ShieldCheck className="h-4 w-4 text-green-800" />
                <AlertTitle>Recommended Approach</AlertTitle>
                <AlertDescription>
                  Add these indexes to your rules to optimize the most common queries in Loop(CSS). Firebase will
                  automatically create indexes when you use{" "}
                  <code className="bg-green-100 px-1 py-0.5 rounded">orderByChild()</code> if{" "}
                  <code className="bg-green-100 px-1 py-0.5 rounded">".indexOn"</code> is defined.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Validation</CardTitle>
              <CardDescription>Validate data structure to maintain application consistency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The security rules include validation to ensure data consistency. Key validation includes:
              </p>

              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <strong>Required Fields</strong>: Checks for required fields using{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">hasChildren()</code>
                </li>
                <li>
                  <strong>Owner Validation</strong>: Ensures users can only write data they own using{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">newData.val() === auth.uid</code>
                </li>
                <li>
                  <strong>Data Types</strong>: While not shown explicitly in the rules, you can validate data types
                </li>
                <li>
                  <strong>Value Constraints</strong>: You can enforce additional constraints like min/max values, string
                  lengths, or allowed values
                </li>
              </ul>

              <Alert className="bg-green-50 border-green-200 text-green-800">
                <ShieldCheck className="h-4 w-4 text-green-800" />
                <AlertTitle>Best Practices</AlertTitle>
                <AlertDescription>
                  <p>Always validate data on both the client and server side:</p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>Client validation improves user experience</li>
                    <li>Server/Firebase validation is essential for security</li>
                    <li>Use the database rules as your last line of defense</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

