import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Settings, Zap, Shield, TrendingUp, AlertTriangle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TradeSettings {
  defaultLeverage: number;
  maxRiskPercent: number;
  autoStopLoss: boolean;
  stopLossPercent: number;
  autoTakeProfit: boolean;
  takeProfitPercent: number;
  trailingStop: boolean;
  trailingStopPercent: number;
  maxDailyTrades: number;
  minConfidence: number;
}

export function TradeAutomationSettings() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<TradeSettings>(() => {
    const saved = localStorage.getItem('tradeAutomationSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      defaultLeverage: 1,
      maxRiskPercent: 2,
      autoStopLoss: true,
      stopLossPercent: 2,
      autoTakeProfit: true,
      takeProfitPercent: 3,
      trailingStop: false,
      trailingStopPercent: 1,
      maxDailyTrades: 10,
      minConfidence: 75,
    };
  });

  const handleSave = () => {
    localStorage.setItem('tradeAutomationSettings', JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "Your trade automation preferences have been updated.",
    });
    setIsOpen(false);
  };

  const updateSetting = <K extends keyof TradeSettings>(key: K, value: TradeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) {
    return (
      <Card className="bg-[#12121a] border-white/5">
        <CardContent className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-gray-400 hover:text-white"
            onClick={() => setIsOpen(true)}
            data-testid="button-open-automation-settings"
          >
            <Settings className="w-4 h-4" />
            Trade Automation Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            Trade Automation Settings
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <Label className="text-sm">Default Leverage</Label>
            </div>
            <Badge variant="outline" className="font-mono" data-testid="text-leverage-value">
              {settings.defaultLeverage}x
            </Badge>
          </div>
          <Slider
            value={[settings.defaultLeverage]}
            onValueChange={([v]) => updateSetting('defaultLeverage', v)}
            min={1}
            max={20}
            step={1}
            className="w-full"
            data-testid="slider-leverage"
          />
          <p className="text-[10px] text-gray-500">Higher leverage increases both profit potential and risk</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-400" />
              <Label className="text-sm">Max Risk Per Trade</Label>
            </div>
            <Badge variant="outline" className="font-mono text-yellow-400" data-testid="text-risk-value">
              {settings.maxRiskPercent}%
            </Badge>
          </div>
          <Slider
            value={[settings.maxRiskPercent]}
            onValueChange={([v]) => updateSetting('maxRiskPercent', v)}
            min={0.5}
            max={5}
            step={0.5}
            className="w-full"
            data-testid="slider-risk"
          />
        </div>

        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <Label className="text-sm">Auto Stop-Loss</Label>
            </div>
            <Switch
              checked={settings.autoStopLoss}
              onCheckedChange={(v) => updateSetting('autoStopLoss', v)}
              data-testid="switch-auto-sl"
            />
          </div>
          {settings.autoStopLoss && (
            <div className="flex items-center gap-2 ml-6">
              <Input
                type="number"
                value={settings.stopLossPercent}
                onChange={(e) => updateSetting('stopLossPercent', parseFloat(e.target.value) || 2)}
                className="w-20 h-8 text-sm bg-white/5"
                min={0.5}
                max={10}
                step={0.5}
                data-testid="input-sl-percent"
              />
              <span className="text-xs text-gray-400">% below entry</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <Label className="text-sm">Auto Take-Profit</Label>
            </div>
            <Switch
              checked={settings.autoTakeProfit}
              onCheckedChange={(v) => updateSetting('autoTakeProfit', v)}
              data-testid="switch-auto-tp"
            />
          </div>
          {settings.autoTakeProfit && (
            <div className="flex items-center gap-2 ml-6">
              <Input
                type="number"
                value={settings.takeProfitPercent}
                onChange={(e) => updateSetting('takeProfitPercent', parseFloat(e.target.value) || 3)}
                className="w-20 h-8 text-sm bg-white/5"
                min={1}
                max={20}
                step={0.5}
                data-testid="input-tp-percent"
              />
              <span className="text-xs text-gray-400">% above entry</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <Label className="text-sm">Trailing Stop</Label>
            </div>
            <Switch
              checked={settings.trailingStop}
              onCheckedChange={(v) => updateSetting('trailingStop', v)}
              data-testid="switch-trailing"
            />
          </div>
          {settings.trailingStop && (
            <div className="flex items-center gap-2 ml-6">
              <Input
                type="number"
                value={settings.trailingStopPercent}
                onChange={(e) => updateSetting('trailingStopPercent', parseFloat(e.target.value) || 1)}
                className="w-20 h-8 text-sm bg-white/5"
                min={0.5}
                max={5}
                step={0.5}
                data-testid="input-trailing-percent"
              />
              <span className="text-xs text-gray-400">% trailing distance</span>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Min. Confidence to Trade</Label>
            <Badge variant="outline" className="font-mono" data-testid="text-min-confidence">
              {settings.minConfidence}%
            </Badge>
          </div>
          <Slider
            value={[settings.minConfidence]}
            onValueChange={([v]) => updateSetting('minConfidence', v)}
            min={60}
            max={95}
            step={5}
            className="w-full"
            data-testid="slider-min-confidence"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <Label className="text-sm">Max Daily Trades</Label>
          <Input
            type="number"
            value={settings.maxDailyTrades}
            onChange={(e) => updateSetting('maxDailyTrades', parseInt(e.target.value) || 10)}
            className="w-20 h-8 text-sm bg-white/5 text-center"
            min={1}
            max={50}
            data-testid="input-max-trades"
          />
        </div>

        <Button 
          className="w-full gap-2" 
          onClick={handleSave}
          data-testid="button-save-settings"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
