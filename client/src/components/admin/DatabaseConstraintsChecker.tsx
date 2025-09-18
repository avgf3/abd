import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Shield, 
  Key, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Table,
  Index,
  Link,
  Lock,
  Eye
} from 'lucide-react';

interface ConstraintInfo {
  constraintName: string;
  tableName: string;
  constraintType: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  columnName?: string;
  referencedTable?: string;
  referencedColumn?: string;
  definition?: string;
  isDeferrable?: boolean;
  initiallyDeferred?: boolean;
}

interface TableInfo {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault?: string;
  characterMaximumLength?: number;
}

interface IndexInfo {
  indexName: string;
  tableName: string;
  columnName: string;
  isUnique: boolean;
  isPrimary: boolean;
}

interface DatabaseConstraintsReport {
  constraints: ConstraintInfo[];
  tables: TableInfo[];
  indexes: IndexInfo[];
  foreignKeys: ConstraintInfo[];
  uniqueConstraints: ConstraintInfo[];
  checkConstraints: ConstraintInfo[];
  summary: {
    totalConstraints: number;
    totalTables: number;
    totalIndexes: number;
    foreignKeyCount: number;
    uniqueConstraintCount: number;
    checkConstraintCount: number;
  };
}

interface HealthReport {
  status: 'healthy' | 'warning' | 'error';
  summary: {
    totalTables: number;
    totalConstraints: number;
    foreignKeyViolations: number;
    missingIndexes: number;
  };
  recommendations: string[];
  details: DatabaseConstraintsReport;
}

const DatabaseConstraintsChecker: React.FC = () => {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [constraintsReport, setConstraintsReport] = useState<DatabaseConstraintsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('health');

  const fetchHealthReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/database/health');
      const data = await response.json();
      
      if (data.success) {
        setHealthReport(data.data);
      } else {
        setError(data.error || 'فشل في الحصول على تقرير الصحة');
      }
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const fetchConstraintsReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/database/constraints');
      const data = await response.json();
      
      if (data.success) {
        setConstraintsReport(data.data);
      } else {
        setError(data.error || 'فشل في الحصول على تقرير المحددات');
      }
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthReport();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">سليم</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-yellow-500">تحذير</Badge>;
      case 'error':
        return <Badge variant="destructive">خطأ</Badge>;
      default:
        return <Badge variant="secondary">غير معروف</Badge>;
    }
  };

  const getConstraintTypeIcon = (type: string) => {
    switch (type) {
      case 'FOREIGN KEY':
        return <Link className="h-4 w-4 text-blue-500" />;
      case 'UNIQUE':
        return <Lock className="h-4 w-4 text-purple-500" />;
      case 'PRIMARY KEY':
        return <Key className="h-4 w-4 text-green-500" />;
      case 'CHECK':
        return <CheckCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConstraintTypeBadge = (type: string) => {
    switch (type) {
      case 'FOREIGN KEY':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">مفتاح خارجي</Badge>;
      case 'UNIQUE':
        return <Badge variant="outline" className="border-purple-500 text-purple-500">فريد</Badge>;
      case 'PRIMARY KEY':
        return <Badge variant="outline" className="border-green-500 text-green-500">مفتاح أساسي</Badge>;
      case 'CHECK':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">تحقق</Badge>;
      default:
        return <Badge variant="outline">محدد</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">فحص محددات قاعدة البيانات</h1>
            <p className="text-gray-600">مراقبة وتحليل محددات قاعدة البيانات</p>
          </div>
        </div>
        <Button 
          onClick={() => {
            if (activeTab === 'health') {
              fetchHealthReport();
            } else {
              fetchConstraintsReport();
            }
          }}
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>تقرير الصحة</span>
          </TabsTrigger>
          <TabsTrigger value="constraints" className="flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>المحددات</span>
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex items-center space-x-2">
            <Table className="h-4 w-4" />
            <span>الجداول</span>
          </TabsTrigger>
          <TabsTrigger value="indexes" className="flex items-center space-x-2">
            <Index className="h-4 w-4" />
            <span>الفهارس</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {healthReport && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getStatusIcon(healthReport.status)}
                    <span>حالة قاعدة البيانات</span>
                    {getStatusBadge(healthReport.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{healthReport.summary.totalTables}</div>
                      <div className="text-sm text-gray-600">إجمالي الجداول</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{healthReport.summary.totalConstraints}</div>
                      <div className="text-sm text-gray-600">إجمالي المحددات</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{healthReport.summary.foreignKeyViolations}</div>
                      <div className="text-sm text-gray-600">انتهاكات المفاتيح الخارجية</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{healthReport.summary.missingIndexes}</div>
                      <div className="text-sm text-gray-600">فهارس مفقودة</div>
                    </div>
                  </div>

                  {healthReport.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">التوصيات</h3>
                      <ul className="space-y-2">
                        {healthReport.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span className="text-sm">{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="constraints" className="space-y-4">
          {constraintsReport && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Link className="h-5 w-5 text-blue-500" />
                      <span>المفاتيح الخارجية</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{constraintsReport.summary.foreignKeyCount}</div>
                    <p className="text-sm text-gray-600">مفتاح خارجي</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Lock className="h-5 w-5 text-purple-500" />
                      <span>محددات التكرار</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">{constraintsReport.summary.uniqueConstraintCount}</div>
                    <p className="text-sm text-gray-600">محدد فريد</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-orange-500" />
                      <span>محددات التحقق</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">{constraintsReport.summary.checkConstraintCount}</div>
                    <p className="text-sm text-gray-600">محدد تحقق</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>جميع المحددات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {constraintsReport.constraints.map((constraint, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getConstraintTypeIcon(constraint.constraintType)}
                            <span className="font-semibold">{constraint.constraintName}</span>
                            {getConstraintTypeBadge(constraint.constraintType)}
                          </div>
                          <Badge variant="outline">{constraint.tableName}</Badge>
                        </div>
                        
                        {constraint.columnName && (
                          <div className="text-sm text-gray-600">
                            العمود: <span className="font-medium">{constraint.columnName}</span>
                          </div>
                        )}
                        
                        {constraint.referencedTable && constraint.referencedColumn && (
                          <div className="text-sm text-gray-600">
                            مرجع: <span className="font-medium">{constraint.referencedTable}.{constraint.referencedColumn}</span>
                          </div>
                        )}
                        
                        {constraint.definition && (
                          <div className="text-sm text-gray-600">
                            التعريف: <code className="bg-gray-100 px-2 py-1 rounded">{constraint.definition}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="tables" className="space-y-4">
          {constraintsReport && (
            <Card>
              <CardHeader>
                <CardTitle>معلومات الجداول والأعمدة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    constraintsReport.tables.reduce((acc, table) => {
                      if (!acc[table.tableName]) {
                        acc[table.tableName] = [];
                      }
                      acc[table.tableName].push(table);
                      return acc;
                    }, {} as Record<string, TableInfo[]>)
                  ).map(([tableName, columns]) => (
                    <div key={tableName} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
                        <Table className="h-5 w-5 text-blue-500" />
                        <span>{tableName}</span>
                        <Badge variant="outline">{columns.length} عمود</Badge>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {columns.map((column, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded space-y-1">
                            <div className="font-medium">{column.columnName}</div>
                            <div className="text-sm text-gray-600">
                              النوع: <span className="font-medium">{column.dataType}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              قابل للقيم الفارغة: <span className="font-medium">{column.isNullable ? 'نعم' : 'لا'}</span>
                            </div>
                            {column.columnDefault && (
                              <div className="text-sm text-gray-600">
                                القيمة الافتراضية: <code className="bg-gray-200 px-1 rounded">{column.columnDefault}</code>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="indexes" className="space-y-4">
          {constraintsReport && (
            <Card>
              <CardHeader>
                <CardTitle>معلومات الفهارس</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    constraintsReport.indexes.reduce((acc, index) => {
                      if (!acc[index.tableName]) {
                        acc[index.tableName] = [];
                      }
                      acc[index.tableName].push(index);
                      return acc;
                    }, {} as Record<string, IndexInfo[]>)
                  ).map(([tableName, indexes]) => (
                    <div key={tableName} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
                        <Index className="h-5 w-5 text-green-500" />
                        <span>{tableName}</span>
                        <Badge variant="outline">{indexes.length} فهرس</Badge>
                      </h3>
                      <div className="space-y-2">
                        {indexes.map((index, indexIdx) => (
                          <div key={indexIdx} className="bg-gray-50 p-3 rounded flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{index.indexName}</span>
                              <span className="text-sm text-gray-600">({index.columnName})</span>
                            </div>
                            <div className="flex space-x-2">
                              {index.isPrimary && <Badge variant="default" className="bg-green-500">أساسي</Badge>}
                              {index.isUnique && <Badge variant="outline" className="border-purple-500 text-purple-500">فريد</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseConstraintsChecker;