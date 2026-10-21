import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronLeft, Crown, Leaf, Loader2, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { t, getLocale } from '../i18n';
import { proProductIds, proSubscription, type ProProduct, type ProProductId } from '../services/proSubscription';
import { useProSubscription } from '../utils/useProSubscription';
import { getUserErrorMessage } from '../utils/userFacingError';

export function ProSubscription({ onBack, inline = false }: { onBack: () => void; inline?: boolean }) {
  const subscription = useProSubscription();
  const [products, setProducts] = useState<ProProduct[]>([]);
  const [selected, setSelected] = useState<ProProductId>(proProductIds[1]);
  const [loading, setLoading] = useState(subscription.supported);
  const [busy, setBusy] = useState<'purchase' | 'restore' | 'manage' | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const lock = useRef(false);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [plans] = await Promise.all([proSubscription.products(), proSubscription.refresh()]);
      if (!mounted.current) return;
      setProducts(plans);
      setSelected(value => plans.some(plan => plan.id === value) ? value : plans[0]?.id ?? proProductIds[1]);
    } catch (failure) { if (mounted.current) setError(getUserErrorMessage(failure, 'Could not load Pro plans. Check your connection and try again.')); }
    finally { if (mounted.current) setLoading(false); }
  };
  useEffect(() => {
    mounted.current = true;
    if (subscription.supported) void load();
    return () => { mounted.current = false; };
  }, []);
  const act = async (action: 'purchase' | 'restore' | 'manage') => {
    if (lock.current) return;
    lock.current = true;
    setBusy(action); setError(''); setNotice('');
    try {
      if (action === 'purchase') {
        const outcome = await proSubscription.purchase(selected);
        if (!mounted.current) return;
        setNotice(outcome === 'pending' ? 'Your purchase is awaiting approval. Pro unlocks when Apple confirms it.'
          : outcome === 'cancelled' ? 'Purchase cancelled. No changes were made.'
          : proSubscription.getSnapshot().isPro ? 'Welcome to Kalo Pro.' : 'Your purchase is being confirmed. Try restoring purchases in a moment.');
      } else if (action === 'restore') {
        const status = await proSubscription.restore();
        if (mounted.current) setNotice(status.isPro ? 'Your Pro subscription has been restored.' : 'No active Pro subscription was found for this Apple Account.');
      } else await proSubscription.manage();
    } catch (failure) { if (mounted.current) setError(getUserErrorMessage(failure, 'Could not update your subscription. Please try again.')); }
    finally { lock.current = false; if (mounted.current) setBusy(null); }
  };
  const plan = products.find(product => product.id === selected);
  return <div className={inline ? 'pro-page pro-page--inline' : 'app-scroll settings-page pro-page'} aria-busy={!!busy}>
    <button type="button" className="text-back" disabled={!!busy} onClick={onBack}><ChevronLeft size={18} />{inline ? t('Back to meal') : t('Settings')}</button>
    <div className="pro-hero"><span className="pro-hero__icon"><Crown size={29} /></span><span className="pro-badge">{t('PRO')}</span>
      <h1>{t('More from every meal.')}</h1><p>{t('Small additions. Better balance. More energy when you want it.')}</p>
    </div>
    <div className="pro-benefits">
      <div><Leaf size={20} /><span><strong>{t('Make it healthier')}</strong><small>{t('Find additions for a more balanced plate.')}</small></span></div>
      <div><Zap size={20} /><span><strong>{t('Add more calories')}</strong><small>{t('See useful portions and their extra calories and macros.')}</small></span></div>
      <div><Sparkles size={20} /><span><strong>{t('Made for your meal')}</strong><small>{t('Suggestions use your ingredients and food preferences.')}</small></span></div>
    </div>
    {subscription.isPro ? <div className="pro-active"><Check size={22} /><div><strong>{t('Kalo Pro is active')}</strong>{subscription.expiresAt && <small>{t('Current period ends {date}', { date: new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(subscription.expiresAt) })}</small>}</div></div>
      : !subscription.supported ? <p className="pro-info">{t('Pro subscriptions are available in the Kalo iPhone app.')}</p>
      : loading ? <p className="pro-loading" role="status"><Loader2 size={20} className="animate-spin" />{t('Loading Pro plans...')}</p>
      : products.length ? <fieldset className="pro-plans" disabled={!!busy}><legend className="sr-only">{t('Choose your Pro plan')}</legend>{proProductIds.map(id => {
        const product = products.find(value => value.id === id);
        if (!product) return null;
        return <label key={id} className={`pro-plan${selected === id ? ' is-selected' : ''}`}><input type="radio" name="pro-plan" value={id} checked={selected === id} onChange={() => setSelected(id)} /><span><strong>{product.period === 'month' ? t('Monthly') : t('Yearly')}</strong><small>{product.period === 'month' ? t('Billed monthly') : t('Billed yearly')}</small></span><b>{product.displayPrice}<small>{product.period === 'month' ? t('/ month') : t('/ year')}</small></b></label>;
      })}</fieldset> : !error && <p className="pro-info">{t('Pro plans are not available yet. Please check back soon.')}</p>}
    {subscription.supported && (subscription.isPro
      ? <button type="button" className="primary-command pro-primary" disabled={!!busy} onClick={() => void act('manage')}>{busy === 'manage' ? <Loader2 size={19} className="animate-spin" /> : <ArrowUpRight size={19} />}{t('Manage subscription')}</button>
      : <button type="button" className="primary-command pro-primary" disabled={!!busy || loading || !plan} onClick={() => void act('purchase')}>{busy === 'purchase' ? <Loader2 size={19} className="animate-spin" /> : <Crown size={19} />}{plan ? t('Subscribe · {price}', { price: plan.displayPrice }) : t('Subscribe to Pro')}</button>)}
    {notice && <p className="pro-info" role="status">{t(notice)}</p>}
    {error && <div className="pro-error" role="alert"><p>{t(error)}</p>{!busy && <button type="button" className="text-back" onClick={() => void load()}><RefreshCw size={16} />{t('Try again')}</button>}</div>}
    {subscription.supported && <button type="button" className="pro-restore text-back" disabled={!!busy} onClick={() => void act('restore')}>{busy === 'restore' && <Loader2 size={16} className="animate-spin" />}{t('Restore purchases')}</button>}
    <p className="pro-legal">{t('Photo estimates and meal logging stay free. Pro adds optional meal suggestions.')}</p>
    {subscription.supported && <p className="pro-legal">{t('Payment is charged to your Apple Account. Subscriptions renew automatically unless cancelled at least 24 hours before the current period ends. Manage or cancel in App Store settings.')}</p>}
    <div className="pro-links"><a href="/privacy.html" target="_blank" rel="noreferrer">{t('Privacy')}</a><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">{t('Terms of use')}</a></div>
  </div>;
}
