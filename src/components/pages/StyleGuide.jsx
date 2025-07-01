import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Eye, Brain, Users, Clock, Sparkles, Calendar, MapPin, Share, 
  AlertCircle, CheckCircle2, XCircle, Info, Heart, Settings,
  Film, Video
} from 'lucide-react';
import { Aperture } from 'phosphor-react';
import { FilmSlate } from 'phosphor-react';

export default function StyleGuide() {
  const [showExampleModal, setShowExampleModal] = useState(false);

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Ember Design System</h1>
        <p className="text-lg text-gray-600">Visual style guide for consistent UI development</p>
      </div>

      {/* Color Palette */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Color Palette</h2>
        
        {/* Primary Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <div className="w-full h-20 bg-blue-600 rounded-lg"></div>
                <div className="text-sm">
                  <div className="font-medium">Blue</div>
                  <div className="text-gray-500">Primary actions, social</div>
                  <code className="text-xs">text-blue-600</code>
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-20 bg-green-600 rounded-lg"></div>
                <div className="text-sm">
                  <div className="font-medium">Green</div>
                  <div className="text-gray-500">Success, nature</div>
                  <code className="text-xs">text-green-600</code>
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-20 bg-red-600 rounded-lg"></div>
                <div className="text-sm">
                  <div className="font-medium">Red</div>
                  <div className="text-gray-500">Destructive actions</div>
                  <code className="text-xs">text-red-600</code>
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-20 bg-purple-600 rounded-lg"></div>
                <div className="text-sm">
                  <div className="font-medium">Purple</div>
                  <div className="text-gray-500">AI features</div>
                  <code className="text-xs">text-purple-600</code>
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-20 bg-orange-600 rounded-lg"></div>
                <div className="text-sm">
                  <div className="font-medium">Orange</div>
                  <div className="text-gray-500">Time/date features</div>
                  <code className="text-xs">text-orange-600</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Status Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="w-full h-16 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center">
                  <span className="text-green-800 font-medium">Success</span>
                </div>
                <code className="text-xs">bg-green-50, border-green-200</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-800 font-medium">Warning</span>
                </div>
                <code className="text-xs">bg-yellow-50, border-yellow-200</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
                  <span className="text-red-800 font-medium">Error</span>
                </div>
                <code className="text-xs">bg-red-50, border-red-200</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
                  <span className="text-blue-800 font-medium">Info</span>
                </div>
                <code className="text-xs">bg-blue-50, border-blue-200</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gray Scale */}
        <Card>
          <CardHeader>
            <CardTitle>Gray Scale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <div className="w-full h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-white font-medium">Primary</span>
                </div>
                <code className="text-xs">text-gray-900</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-gray-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-medium">Secondary</span>
                </div>
                <code className="text-xs">text-gray-600</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-gray-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-medium">Muted</span>
                </div>
                <code className="text-xs">text-gray-500</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-700 font-medium">Border</span>
                </div>
                <code className="text-xs">border-gray-200</code>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-700 font-medium">Background</span>
                </div>
                <code className="text-xs">bg-gray-100</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Typography</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Text Hierarchy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Modal Title</h1>
              <code className="text-xs text-gray-500">text-xl font-bold text-gray-900</code>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Section Header</h2>
              <code className="text-xs text-gray-500">text-lg font-semibold text-gray-900</code>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Card Title</h3>
              <code className="text-xs text-gray-500">font-medium text-gray-900</code>
            </div>
            <div>
              <p className="text-gray-900">Primary body text</p>
              <code className="text-xs text-gray-500">text-gray-900</code>
            </div>
            <div>
              <p className="text-gray-600">Secondary body text</p>
              <code className="text-xs text-gray-500">text-gray-600</code>
            </div>
            <div>
              <p className="text-sm text-gray-500">Small text</p>
              <code className="text-xs text-gray-500">text-sm text-gray-500</code>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Icons & Feature Themes */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Icons & Feature Themes</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Feature Icons with Color Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center space-y-2">
                <Eye className="w-8 h-8 text-purple-600 mx-auto" />
                <div className="text-sm font-medium">AI Analysis</div>
                <code className="text-xs">text-purple-600</code>
              </div>
              <div className="text-center space-y-2">
                <Users className="w-8 h-8 text-blue-600 mx-auto" />
                <div className="text-sm font-medium">Social Features</div>
                <code className="text-xs">text-blue-600</code>
              </div>
              <div className="text-center space-y-2">
                <Calendar className="w-8 h-8 text-orange-600 mx-auto" />
                <div className="text-sm font-medium">Time & Date</div>
                <code className="text-xs">text-orange-600</code>
              </div>
              <div className="text-center space-y-2">
                <MapPin className="w-8 h-8 text-blue-600 mx-auto" />
                <div className="text-sm font-medium">Location</div>
                <code className="text-xs">text-blue-600</code>
              </div>
              <div className="text-center space-y-2">
                <Share className="w-8 h-8 text-blue-600 mx-auto" />
                <div className="text-sm font-medium">Sharing</div>
                <code className="text-xs">text-blue-600</code>
              </div>
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <Aperture size={32} className="text-blue-600" />
                </div>
                <div className="text-sm font-medium">Ember Names</div>
                <code className="text-xs">text-blue-600</code>
              </div>
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <FilmSlate size={32} className="text-blue-600" />
                </div>
                <div className="text-sm font-medium">Story Cuts</div>
                <code className="text-xs">text-blue-600</code>
              </div>
              <div className="text-center space-y-2">
                <Settings className="w-8 h-8 text-gray-600 mx-auto" />
                <div className="text-sm font-medium">Settings</div>
                <code className="text-xs">text-gray-600</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Buttons</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Button variant="blue" size="lg" className="w-full">Primary</Button>
                <code className="text-xs">variant="blue"</code>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="lg" className="w-full">Secondary</Button>
                <code className="text-xs">variant="outline"</code>
              </div>
              <div className="space-y-2">
                <Button variant="destructive" size="lg" className="w-full">Destructive</Button>
                <code className="text-xs">variant="destructive"</code>
              </div>
              <div className="space-y-2">
                <Button variant="blue" size="lg" disabled className="w-full">Disabled</Button>
                <code className="text-xs">disabled</code>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button variant="blue" size="lg" className="w-full">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Loading...
              </Button>
              <Button variant="outline" size="lg" className="w-full">
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </Button>
              <Button variant="destructive" size="lg" className="w-full">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Alerts & Messages */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Alerts & Messages</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Alert Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Success:</strong> Your ember has been created successfully!
              </AlertDescription>
            </Alert>
            
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Warning:</strong> This action will permanently delete all data.
              </AlertDescription>
            </Alert>
            
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Error:</strong> Failed to process your request. Please try again.
              </AlertDescription>
            </Alert>
            
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Info:</strong> Your changes will be saved automatically.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      {/* Modal Specifications */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Modal Specifications</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Modal Widths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="font-medium text-blue-900">Standard Modal</div>
                    <div className="text-sm text-blue-700">448px (max-w-md)</div>
                    <div className="text-xs text-blue-600 mt-1">Contributors, Location, Date/Time, Share, Names</div>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="font-medium text-green-900">Story Modal</div>
                    <div className="text-sm text-green-700">512px (max-w-lg)</div>
                    <div className="text-xs text-green-600 mt-1">Story conversations</div>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="font-medium text-purple-900">Analysis Modal</div>
                    <div className="text-sm text-purple-700">672px (max-w-2xl)</div>
                    <div className="text-xs text-purple-600 mt-1">AI image analysis</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowExampleModal(true)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview Standard Modal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Form Elements */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Form Elements</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Input Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Label Text</Label>
              <Input placeholder="Input placeholder text" />
              <div className="text-xs text-gray-500">Helper text description</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Error State</Label>
              <Input placeholder="Error input" className="border-red-300" />
              <div className="text-xs text-red-600">Error message text</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Success State</Label>
              <Input placeholder="Success input" className="border-green-300" />
              <div className="text-xs text-green-600">Success message text</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Badges & Tags</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Badge Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge className="bg-blue-100 text-blue-800">Custom Blue</Badge>
              <Badge className="bg-green-100 text-green-800">Custom Green</Badge>
              <Badge className="bg-purple-100 text-purple-800">Custom Purple</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Layout Specifications */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Layout Specifications</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Spacing & Containers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">Container Widths</div>
              <code className="text-sm">max-w-4xl mx-auto</code> - Desktop container
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">Modal Padding</div>
              <code className="text-sm">px-4 pb-4</code> - Mobile<br/>
              <code className="text-sm">p-6</code> - Desktop
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">Section Spacing</div>
              <code className="text-sm">space-y-4</code> - Standard<br/>
              <code className="text-sm">space-y-6</code> - Large sections
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">Panel Widths</div>
              <code className="text-sm">w-[90%]</code> - All panels (Settings, Story Cuts)
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Example Modal */}
      <Dialog open={showExampleModal} onOpenChange={setShowExampleModal}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-md rounded-2xl focus:outline-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Eye className="w-5 h-5 text-blue-600" />
              Example Standard Modal
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              This is what a standard modal looks like following the style guide
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-900">This modal demonstrates:</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Standard width: 448px (max-w-md)</li>
              <li>Blue icon theme</li>
              <li>Proper typography hierarchy</li>
              <li>Consistent spacing</li>
              <li>Focus outline prevention</li>
            </ul>
            
            <div className="pt-4 border-t">
              <Button 
                variant="blue" 
                onClick={() => setShowExampleModal(false)}
                className="w-full"
              >
                Close Modal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 