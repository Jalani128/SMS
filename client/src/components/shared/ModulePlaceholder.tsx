import React, { useState } from 'react';
import { PageHeader } from './PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { Dialog } from '../ui/Dialog';
import {
  Search,
  Filter,
  Download,
  Plus,
  Layers,
  Database,
  LucideIcon,
} from 'lucide-react';

export interface ModulePlaceholderProps {
  moduleName: string;
  moduleCategory: string;
  icon: LucideIcon;
  description: string;
  recordsCount?: number | string;
  plannedEndpoints: string[];
  plannedSchemaFields: string[];
  mockTableHeaders?: string[];
  mockTableRows?: string[][];
  addButtonLabel?: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleName,
  moduleCategory,
  icon: Icon,
  description,
  recordsCount = 'Ready for Phase 2',
  plannedEndpoints,
  plannedSchemaFields,
  mockTableHeaders = ['ID', 'Title / Name', 'Category', 'Assigned To', 'Updated At', 'Status'],
  mockTableRows = [
    ['001', 'Sample Initial Record A', 'Primary Division', 'Faculty Mentor', 'Today at 10:30 AM', 'Active'],
    ['002', 'Sample Initial Record B', 'Secondary Division', 'Head of Dept', 'Yesterday at 3:15 PM', 'Active'],
    ['003', 'Archived Benchmark Record', 'Administrative', 'Registrar Office', 'Oct 12, 2026', 'Pending'],
  ],
  addButtonLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={moduleName}
        description={description}
        badge={<Badge variant="outline">{moduleCategory}</Badge>}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {addButtonLabel || `+ Add ${moduleName.slice(0, -1) || moduleName}`}
            </Button>
          </>
        }
      />

      {/* Phase 1 Scaffolding Notice Card */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0 shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Phase 1 Groundwork: {moduleName} Architecture
                  </h3>
                  <Badge variant="info" className="text-[10px]">
                    Scaffolding
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  UI shell, route grouping, navigation bindings, and multi-tenant scoping are ready.
                  Backend Mongoose schemas, controllers, and Socket.IO hooks will be implemented in Phase 2 upon your review and approval.
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Scoping Rule</span>
              <span className="text-xs font-mono font-semibold text-primary">schoolId Multi-Tenant</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs & Controls */}
      <Tabs defaultValue="all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">Active Records ({recordsCount})</TabsTrigger>
            <TabsTrigger value="architecture">Phase 2 API Contract</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={`Search ${moduleName.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs text-muted-foreground gap-1">
              <Filter className="h-3 w-3" />
              Filter
            </Button>
          </div>
        </div>

        {/* Tab 1: Mock Table Groundwork */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold">{moduleName} Directory</CardTitle>
              <CardDescription className="text-xs">
                Interactive preview table showcasing shadcn/ui table formatting and responsive overflow
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-y text-muted-foreground font-semibold">
                    <tr>
                      {mockTableHeaders.map((header, i) => (
                        <th key={i} className="px-4 py-3">
                          {header}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {mockTableRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
                        {row.map((cell, colIdx) => (
                          <td key={colIdx} className="px-4 py-3">
                            {colIdx === row.length - 1 ? (
                              <Badge variant={cell === 'Active' ? 'success' : 'neutral'} className="text-[10px]">
                                {cell}
                              </Badge>
                            ) : (
                              <span className={colIdx === 0 ? 'font-mono text-muted-foreground' : 'font-medium'}>
                                {cell}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2">
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Phase 2 Architecture Specs */}
        <TabsContent value="architecture">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Planned MongoDB Mongoose Schema</CardTitle>
                </div>
                <CardDescription className="text-xs">Data fields scoped with tenant index</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-3 rounded-lg bg-muted font-mono text-xs space-y-1">
                  <div className="text-emerald-600 dark:text-emerald-400">// Automatic Multi-Tenant Scoping</div>
                  <div>schoolId: ObjectId (Indexed, Required)</div>
                  {plannedSchemaFields.map((field, idx) => (
                    <div key={idx} className="text-foreground/90">
                      {field}
                    </div>
                  ))}
                  <div className="text-muted-foreground">createdAt: Date, updatedAt: Date</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Planned Express API Endpoints</CardTitle>
                </div>
                <CardDescription className="text-xs">REST conventions enforcing RBAC and tenantMiddleware</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {plannedEndpoints.map((ep, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs"
                    >
                      <span className="font-mono text-[11px] font-semibold">{ep}</span>
                      <Badge variant="outline" className="text-[10px]">
                        RBAC Protected
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Demo Modal Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={`New ${moduleName} Entry (Phase 1 UI Shell)`}
        description="Scaffolding dialog demonstrating form inputs and modal architecture."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                alert(`[Phase 1 Demo] Action confirmed for ${moduleName}. Real API mutation will run in Phase 2!`);
                setIsDialogOpen(false);
              }}
            >
              Confirm Entry
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input placeholder="Enter title or identifying name..." />
          <Select
            options={[
              { label: 'Category: Academic Default', value: 'acad' },
              { label: 'Category: Administrative', value: 'admin' },
              { label: 'Category: Finance Scoped', value: 'fin' },
            ]}
          />
          <div className="p-2.5 rounded bg-muted/60 text-xs text-muted-foreground">
            Multi-Tenant Safety: All write operations are guaranteed to inherit <code className="text-primary font-mono">req.schoolId</code> on the backend.
          </div>
        </div>
      </Dialog>
    </div>
  );
};
