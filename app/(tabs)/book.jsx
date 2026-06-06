import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { serviceService, slotService, reservationService, pickupService } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

// Localisation française du calendrier
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  monthNamesShort: ['Jan.','Fév.','Mar.','Avr.','Mai','Juin','Juil.','Août','Sep.','Oct.','Nov.','Déc.'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = 'fr';

/**
 * Formate le libellé d'un tarif sans mention "en ligne" / "sur place"
 * et ajoute l'unité de façon lisible
 */
function formatPriceTag(rule) {
  // Nettoie le label : retire les mentions "en ligne", "sur place"
  const clean = rule.label
    .replace(/\s*[-–]\s*en ligne/gi, '')
    .replace(/\s*[-–]\s*sur place/gi, '')
    .replace(/^en ligne$/gi, '')
    .replace(/^sur place$/gi, '')
    .trim();

  // Si le label contient déjà une durée (30 min, 1h, 2h…),
  // elle sert d'indication de temps → pas d'unité supplémentaire
  const hasTime = /\d+\s*(min|h)\b/i.test(clean);
  if (hasTime) return { label: clean, unit: '' };

  // Formate l'unité
  let unit = '';
  if (rule.unit === 'par personne') unit = '/h';        // La Cage : par pers/h → /h
  else if (rule.unit === 'par session') unit = '/h';
  else if (rule.unit?.startsWith('forfait')) unit = '';

  return { label: clean, unit };
}

const VENUE_TYPE_LABELS = {
  TERRAIN_5X5: '5×5',
  DEMI_TERRAIN_5X5: '½ 5×5',
  TERRAIN_3X3: '3×3',
  CAGE_1V1: '1v1',
};

const EXTRA_PLAYER_PRICE = 6; // Prix par joueur supplémentaire

// Mapping service ID → types de terrain autorisés (null = tous)
const SERVICE_VENUE_FILTER = {
  'match-5x5':       ['TERRAIN_5X5'],
  'match-grand-3x3': ['DEMI_TERRAIN_5X5'],
  'match-3x3':       ['TERRAIN_3X3'],
  'cage-service':    ['CAGE_1V1'],
  'pickup-game':     null, // tous les terrains
};

// Services qui nécessitent un terrain + créneau
const NEEDS_SLOT = ['MATCH_AMIS'];
// Services sur réservation simple (pas de créneau spécifique)
const REQUEST_ONLY = ['PICKUP_GAME', 'ANNIVERSAIRE', 'COACHING', 'TOURNOI', 'LEAGUE', 'ACADEMY', 'CORPORATE', 'CAMP'];

// Jours autorisés pour les anniversaires (0=dim, 3=mer, 6=sam)
const ANNIVERSAIRE_DAYS = [0, 3, 6];

// Pickup Game : lundi à vendredi uniquement (1-5)
const PICKUP_DAYS = [1, 2, 3, 4, 5];
const PICKUP_MAX = 20;

function getDisabledPickupDates() {
  const disabled = {};
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (!PICKUP_DAYS.includes(d.getDay())) {
      const key = d.toISOString().split('T')[0];
      disabled[key] = { disabled: true, disableTouchEvent: true };
    }
  }
  return disabled;
}

// Prix animateur par service d'anniversaire
const ANIMATOR_PRICE = {
  'anniversaire-all-star': 50, // 2h
  'anniversaire-star':     30, // 1h
  'anniversaire-rookie':   30, // 1h
};

// Génère les dates désactivées pour le calendrier anniversaire (90 jours)
function getDisabledAnniversaireDates() {
  const disabled = {};
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (!ANNIVERSAIRE_DAYS.includes(d.getDay())) {
      const key = d.toISOString().split('T')[0];
      disabled[key] = { disabled: true, disableTouchEvent: true };
    }
  }
  return disabled;
}

export default function BookScreen() {
  const { type, service: serviceParam, pack: packParam, price: priceParam } = useLocalSearchParams();
  const router = useRouter();

  // Étapes : 1=service, 2=date, 3=terrain+créneau, 4=confirmation
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [venueSlots, setVenueSlots] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [extraPlayers, setExtraPlayers] = useState(0);
  const [participants, setParticipants] = useState(1);
  const [withAnimator, setWithAnimator] = useState(false);
  const [pickupAvailability, setPickupAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  // Pack coaching (pack=2 ou pack=4, price=60 ou price=120)
  const [coachingPack, setCoachingPack] = useState(null);

  // Date min = aujourd'hui
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    serviceService.getAll()
      .then(({ data }) => {
        setServices(data);
        // Pré-sélection via paramètre type (ex: ?type=PICKUP_GAME)
        if (type) {
          const match = data.find(s => s.type === type);
          if (match) { setSelectedService(match); setStep(2); }
        }
        // Pré-sélection via paramètre service (ex: ?service=coaching&pack=2&price=60)
        if (serviceParam === 'coaching' && packParam && priceParam) {
          const match = data.find(s => s.type === 'COACHING');
          if (match) {
            setSelectedService(match);
            setCoachingPack({ sessions: parseInt(packParam), price: parseFloat(priceParam) });
            setStep(3); // Aller directement à l'étape confirmation (pas besoin de date)
          }
        }
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger les services'))
      .finally(() => setLoading(false));
  }, [type, serviceParam, packParam, priceParam]);

  async function handleDateSelect(day) {
    setSelectedDate(day.dateString);
    setSelectedVenue(null);
    setSelectedSlot(null);
    setExtraPlayers(0);
    setParticipants(1);
    setWithAnimator(false);
    setPickupAvailability(null);

    // Chargement disponibilité pickup
    if (selectedService?.type === 'PICKUP_GAME') {
      try {
        const { data } = await pickupService.getAvailability(day.dateString);
        setPickupAvailability(data);
        // Limiter le compteur aux places restantes
        setParticipants(1);
      } catch { /* silencieux */ }
    }

    if (NEEDS_SLOT.includes(selectedService?.type)) {
      setSlotsLoading(true);
      try {
        const { data } = await slotService.getByVenue(day.dateString);
        setVenueSlots(data);
      } catch {
        Alert.alert('Erreur', 'Impossible de charger les créneaux');
      } finally {
        setSlotsLoading(false);
      }
    }
    setStep(3);
  }

  async function handleBook() {
    setBooking(true);
    try {
      // Cas coaching pack
      if (coachingPack) {
        await reservationService.create({
          serviceId: selectedService.id,
          venueId: null,
          slotId: null,
          participants: 1,
          totalPrice: coachingPack.price,
          notes: `Pack ${coachingPack.sessions} séances — Le coach prendra contact pour convenir des dates.`,
        });
        setStep(4);
        return;
      }

      const rule = selectedService.pricingRules.find(r => r.isOnline) || selectedService.pricingRules[0];
      const isCageVenue = selectedVenue?.type === 'CAGE_1V1';
      const isMachine = selectedService.type === 'MACHINE_SHOOT';
      const isTerrainMatch = selectedService.type === 'MATCH_AMIS' && !isCageVenue;
      const bp = rule?.price || 0;
      const needsPart = isCageVenue || isMachine;
      const animCost = (selectedService.type === 'ANNIVERSAIRE' && withAnimator) ? (ANIMATOR_PRICE[selectedService.id] || 0) : 0;
      const total = needsPart
        ? bp * participants
        : bp + (isTerrainMatch ? extraPlayers * EXTRA_PLAYER_PRICE : 0) + animCost;
      await reservationService.create({
        serviceId: selectedService.id,
        venueId: selectedVenue?.id || null,
        slotId: selectedSlot?.id || null,
        participants: needsPart ? participants : isTerrainMatch ? (selectedVenue?.capacity || 1) + extraPlayers : 1,
        totalPrice: total,
        notes: selectedDate ? `Date souhaitée : ${selectedDate}` : null,
      });
      setStep(4);
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.error || 'Impossible de réserver');
    } finally {
      setBooking(false);
    }
  }

  function reset() {
    setExtraPlayers(0);
    setParticipants(1);
    setWithAnimator(false);
    setPickupAvailability(null);
    setStep(1);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedVenue(null);
    setSelectedSlot(null);
    setParticipants(1);
    setVenueSlots([]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  // Étape 4 — Confirmation
  if (step === 4) {
    const isCoaching = coachingPack != null;
    return (
      <View style={styles.container}>
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>{isCoaching ? '💪' : '🎉'}</Text>
          <Text style={styles.successTitle}>{isCoaching ? 'Demande envoyée !' : 'Réservation envoyée !'}</Text>

          {isCoaching ? (
            <>
              <View style={styles.coachingConfirmCard}>
                <Text style={styles.coachingConfirmTitle}>Pack {coachingPack.sessions} séances — {coachingPack.price}€</Text>
                <Text style={styles.coachingConfirmText}>✅ Votre demande a bien été enregistrée.</Text>
                <Text style={styles.coachingConfirmText}>📞 Notre coach va vous contacter dans les plus brefs délais pour :</Text>
                <View style={styles.coachingSteps}>
                  <Text style={styles.coachingStep}>🗓️  Convenir des dates de vos séances</Text>
                  <Text style={styles.coachingStep}>🤝  Fixer un rendez-vous pour évaluer vos besoins</Text>
                  <Text style={styles.coachingStep}>🎯  Construire votre programme personnalisé</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.successText}>
              Votre demande de réservation pour{' '}
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>{selectedService?.name}</Text>
              {selectedDate ? ` le ${new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}
              {selectedSlot ? ` à ${new Date(selectedSlot.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}{' '}
              a bien été enregistrée. Nous la confirmons sous peu.
            </Text>
          )}

          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(tabs)/reservations')}>
            <Text style={styles.btnPrimaryText}>Voir mes réservations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={reset}>
            <Text style={styles.btnOutlineText}>Faire une autre réservation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Sélectionne la bonne règle tarifaire selon heure creuse/pleine
  function getActiveRule(service, slot) {
    if (!service?.pricingRules?.length) return null;
    const onlineRules = service.pricingRules.filter(r => r.isOnline);
    if (!onlineRules.length) return service.pricingRules[0];

    // Si des règles heure creuse/pleine existent, on choisit selon le créneau
    const hasPeakRules = onlineRules.some(r => r.isPeakHour !== null && r.isPeakHour !== undefined);
    if (hasPeakRules && slot) {
      const peak = slot.isPeakHour;
      const matched = onlineRules.find(r => r.isPeakHour === peak);
      if (matched) return matched;
    }
    // Sinon, on prend la première règle en ligne
    return onlineRules[0];
  }

  const rule = getActiveRule(selectedService, selectedSlot);
  const isCage = selectedVenue?.type === 'CAGE_1V1';
  const isMachineShoot = selectedService?.type === 'MACHINE_SHOOT';
  const isPickup = selectedService?.type === 'PICKUP_GAME';
  const isAnniversaire = selectedService?.type === 'ANNIVERSAIRE';
  // Extra players uniquement sur les terrains (pas La Cage)
  const isMatchAmis = selectedService?.type === 'MATCH_AMIS' && !isCage;
  // Services avec compteur de participants × prix
  const needsParticipants = isCage || isMachineShoot || isPickup;
  const basePrice = rule?.price || 0;
  const extraCost = isMatchAmis ? extraPlayers * EXTRA_PLAYER_PRICE : 0;
  const animatorPrice = (isAnniversaire && withAnimator) ? (ANIMATOR_PRICE[selectedService?.id] || 0) : 0;
  const totalPrice = needsParticipants
    ? basePrice * participants
    : basePrice + extraCost + animatorPrice;

  return (
    <View style={styles.container}>
      {/* Barre de progression */}
      <View style={styles.progressBar}>
        {[1,2,3].map(s => (
          <View key={s} style={[styles.progressStep, step >= s && styles.progressStepActive]}>
            <Text style={[styles.progressNum, step >= s && styles.progressNumActive]}>{s}</Text>
          </View>
        ))}
        <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
        <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ÉTAPE 1 — Choisir le service */}
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Choisissez un service</Text>
            {services.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[styles.card, selectedService?.id === service.id && styles.cardSelected]}
                onPress={() => { setSelectedService(service); setStep(2); }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{service.name}</Text>
                  <Text style={styles.cardArrow}>→</Text>
                </View>
                {service.description && <Text style={styles.cardDesc}>{service.description}</Text>}
                <View style={styles.prices}>
                  {service.pricingRules.filter(r => r.isOnline).map(r => {
                    const { label, unit } = formatPriceTag(r);
                    return (
                      <View key={r.id} style={styles.priceTag}>
                        <Text style={styles.priceAmount}>{r.price}€<Text style={styles.priceUnit}>{unit}</Text></Text>
                        {label ? <Text style={styles.priceLabel}>{label}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ÉTAPE 2 — Choisir la date */}
        {step === 2 && (
          <>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
              <Text style={styles.backText}>← {selectedService?.name}</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>Choisissez une date</Text>
            <Calendar
              firstDay={1}
              minDate={today}
              onDayPress={handleDateSelect}
              markedDates={{
                ...(isAnniversaire ? getDisabledAnniversaireDates() : {}),
                ...(isPickup ? getDisabledPickupDates() : {}),
                ...(selectedDate ? { [selectedDate]: { selected: true, selectedColor: Colors.primary } } : {}),
              }}
              theme={{
                backgroundColor: '#1E1E30',
                calendarBackground: '#1E1E30',
                textSectionTitleColor: Colors.gray,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: Colors.white,
                todayTextColor: Colors.primary,
                dayTextColor: Colors.white,
                textDisabledColor: '#444',
                arrowColor: Colors.primary,
                monthTextColor: Colors.white,
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
                textDayHeaderFontWeight: '600',
              }}
              style={styles.calendar}
            />

            {/* Pour les services sans créneau, bouton direct */}
            {isAnniversaire && (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>🎂 Disponible uniquement le mercredi, samedi et dimanche</Text>
              </View>
            )}
            {isPickup && (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>🏀 Sessions du lundi au vendredi · 18h–20h · max {PICKUP_MAX} joueurs/soir</Text>
              </View>
            )}

            {REQUEST_ONLY.includes(selectedService?.type) && selectedDate && (
              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={() => setStep(3)}>
                <Text style={styles.btnPrimaryText}>Continuer →</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ÉTAPE 3 — Terrain + Créneau (ou confirmation coaching) */}
        {step === 3 && (
          <>
            {/* Cas spécial : pack coaching (pas de date, confirmation directe) */}
            {coachingPack ? (
              <View style={styles.coachingPackBox}>
                <Text style={styles.stepTitle}>💪 Votre pack coaching</Text>
                <View style={styles.coachingPackCard}>
                  <Text style={styles.coachingPackEmoji}>{coachingPack.sessions === 4 ? '🥇' : '🥈'}</Text>
                  <Text style={styles.coachingPackTitle}>Pack {coachingPack.sessions} séances</Text>
                  <Text style={styles.coachingPackPrice}>{coachingPack.price}€</Text>
                  <View style={styles.coachingPackInfo}>
                    <Text style={styles.coachingPackLine}>📞 Le coach vous contactera après la réservation</Text>
                    <Text style={styles.coachingPackLine}>🤝 Rendez-vous d'évaluation de vos besoins</Text>
                    <Text style={styles.coachingPackLine}>🗓️ Dates des séances fixées ensemble</Text>
                    <Text style={styles.coachingPackLine}>🎯 Programme personnalisé selon votre niveau</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.btnPrimary, { marginTop: 12 }]} onPress={handleBook} disabled={booking}>
                  {booking
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnPrimaryText}>Valider ma demande — {coachingPack.price}€</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnOutline, { marginTop: 8 }]} onPress={() => { setCoachingPack(null); router.push('/(tabs)'); }}>
                  <Text style={styles.btnOutlineText}>Changer de pack</Text>
                </TouchableOpacity>
              </View>
            ) : (
            <>
            <TouchableOpacity onPress={() => setStep(2)} style={styles.backBtn}>
              <Text style={styles.backText}>← {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>
              {NEEDS_SLOT.includes(selectedService?.type) ? 'Choisissez un terrain et un créneau' : 'Confirmer votre demande'}
            </Text>

            {slotsLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />
            ) : (
              <>
                {/* Sélection terrain + créneaux */}
                {NEEDS_SLOT.includes(selectedService?.type) && venueSlots
                  .filter(({ venue }) => {
                    const allowed = SERVICE_VENUE_FILTER[selectedService?.id];
                    return allowed === null || allowed === undefined || allowed.includes(venue.type);
                  })
                  .map(({ venue, slots }) => {
                  const available = slots.filter(s => !s.isBooked);
                  if (available.length === 0) return null;
                  return (
                    <View key={venue.id} style={styles.venueBlock}>
                      <View style={styles.venueHeader}>
                        <Text style={styles.venueName}>{venue.name}</Text>
                        <View style={styles.venueTypeBadge}>
                          <Text style={styles.venueTypeTxt}>{VENUE_TYPE_LABELS[venue.type]}</Text>
                        </View>
                      </View>
                      <View style={styles.slotsGrid}>
                        {available.map(slot => {
                          const isSelected = selectedSlot?.id === slot.id;
                          const timeStr = new Date(slot.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <TouchableOpacity
                              key={slot.id}
                              style={[styles.slotBtn, isSelected && styles.slotBtnSelected]}
                              onPress={() => { setSelectedVenue(venue); setSelectedSlot(slot); }}
                            >
                              <Text style={[styles.slotTime, isSelected && styles.slotTimeSelected]}>{timeStr}</Text>
                              <Text style={[styles.slotPeak, isSelected && { color: Colors.primary }]}>
                                {slot.isPeakHour ? '🔴 HP' : '🟢 HC'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                {NEEDS_SLOT.includes(selectedService?.type) && venueSlots
                  .filter(({ venue }) => {
                    const allowed = SERVICE_VENUE_FILTER[selectedService?.id];
                    return allowed === null || allowed === undefined || allowed.includes(venue.type);
                  })
                  .every(v => v.slots.filter(s => !s.isBooked).length === 0) && (
                  <View style={styles.noSlots}>
                    <Text style={styles.noSlotsText}>Aucun créneau disponible ce jour.</Text>
                    <TouchableOpacity onPress={() => setStep(2)}>
                      <Text style={[styles.noSlotsText, { color: Colors.primary, marginTop: 8 }]}>Choisir une autre date</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Joueurs supplémentaires (uniquement pour MATCH_AMIS) */}
                {isMatchAmis && selectedVenue && (
                  <View style={styles.extraBox}>
                    <View style={styles.extraHeader}>
                      <Text style={styles.extraTitle}>Joueurs supplémentaires</Text>
                      <Text style={styles.extraSubtitle}>
                        {selectedVenue.capacity} joueurs inclus · +{EXTRA_PLAYER_PRICE}€/joueur supp.
                      </Text>
                    </View>
                    <View style={styles.counter}>
                      <TouchableOpacity
                        style={[styles.counterBtn, extraPlayers === 0 && styles.counterBtnDisabled]}
                        onPress={() => setExtraPlayers(Math.max(0, extraPlayers - 1))}
                        disabled={extraPlayers === 0}
                      >
                        <Text style={styles.counterBtnText}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.counterMid}>
                        <Text style={styles.counterValue}>+{extraPlayers}</Text>
                        <Text style={styles.counterSub}>joueur{extraPlayers > 1 ? 's' : ''}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.counterBtn, extraPlayers === 2 && styles.counterBtnDisabled]}
                        onPress={() => setExtraPlayers(Math.min(2, extraPlayers + 1))}
                        disabled={extraPlayers === 2}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.extraMax}>Maximum 2 joueurs supplémentaires</Text>
                  </View>
                )}

                {/* Disponibilité Pickup Game */}
                {isPickup && pickupAvailability && (
                  <View style={[styles.pickupAvail, pickupAvailability.remaining <= 5 && styles.pickupAvailWarning]}>
                    <View style={styles.pickupAvailLeft}>
                      <Text style={styles.pickupAvailTitle}>
                        {pickupAvailability.remaining === 0 ? '🔴 Complet' : `🟢 ${pickupAvailability.remaining} place${pickupAvailability.remaining > 1 ? 's' : ''} restante${pickupAvailability.remaining > 1 ? 's' : ''}`}
                      </Text>
                      <Text style={styles.pickupAvailSub}>18h–20h · {pickupAvailability.taken}/{PICKUP_MAX} inscrits</Text>
                    </View>
                    <View style={styles.pickupBar}>
                      <View style={[styles.pickupBarFill, { width: `${(pickupAvailability.taken / PICKUP_MAX) * 100}%` }]} />
                    </View>
                  </View>
                )}

                {/* Compteur participants */}
                {needsParticipants && (isCage ? selectedVenue : true) && !(isPickup && pickupAvailability?.remaining === 0) && (
                  <View style={styles.extraBox}>
                    <View style={styles.extraHeader}>
                      <Text style={styles.extraTitle}>Participants</Text>
                      <Text style={styles.extraSubtitle}>
                        {basePrice}€/pers.{' '}
                        {isPickup
                          ? `· ${pickupAvailability ? pickupAvailability.remaining : PICKUP_MAX} place${pickupAvailability?.remaining !== 1 ? 's' : ''} dispo.`
                          : `· max ${isCage ? 4 : 2} joueur${(isCage ? 4 : 2) > 1 ? 's' : ''}`}
                      </Text>
                    </View>
                    <View style={styles.counter}>
                      <TouchableOpacity
                        style={[styles.counterBtn, participants === 1 && styles.counterBtnDisabled]}
                        onPress={() => setParticipants(Math.max(1, participants - 1))}
                        disabled={participants === 1}
                      >
                        <Text style={styles.counterBtnText}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.counterMid}>
                        <Text style={styles.counterValue}>{participants}</Text>
                        <Text style={styles.counterSub}>joueur{participants > 1 ? 's' : ''}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.counterBtn, participants === (isPickup ? (pickupAvailability?.remaining || PICKUP_MAX) : isCage ? 4 : 2) && styles.counterBtnDisabled]}
                        onPress={() => setParticipants(Math.min(isPickup ? (pickupAvailability?.remaining || PICKUP_MAX) : isCage ? 4 : 2, participants + 1))}
                        disabled={participants === (isPickup ? (pickupAvailability?.remaining || PICKUP_MAX) : isCage ? 4 : 2)}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Message complet pickup */}
                {isPickup && pickupAvailability?.remaining === 0 && (
                  <View style={styles.fullBox}>
                    <Text style={styles.fullText}>🔴 Session complète pour ce soir</Text>
                    <TouchableOpacity onPress={() => setStep(2)}>
                      <Text style={[styles.fullText, { color: Colors.primary, marginTop: 8 }]}>Choisir une autre date</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Option animateur — anniversaires uniquement */}
                {isAnniversaire && ANIMATOR_PRICE[selectedService?.id] && (
                  <TouchableOpacity
                    style={[styles.animatorBox, withAnimator && styles.animatorBoxActive]}
                    onPress={() => setWithAnimator(!withAnimator)}
                  >
                    <View style={styles.animatorLeft}>
                      <Text style={styles.animatorEmoji}>🎤</Text>
                      <View>
                        <Text style={styles.animatorTitle}>Ajouter un animateur</Text>
                        <Text style={styles.animatorSubtitle}>
                          {ANIMATOR_PRICE[selectedService?.id]}€ · {selectedService?.id === 'anniversaire-all-star' ? '2h' : '1h'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.animatorCheck, withAnimator && styles.animatorCheckActive]}>
                      {withAnimator && <Text style={styles.animatorCheckMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                )}

                {/* Récap prix */}
                {rule && (
                  <View style={styles.recap}>
                    <View style={styles.recapRow}>
                      <Text style={styles.recapLabel}>
                        {selectedService?.name}
                        {rule.isPeakHour === true ? ' (HP)' : rule.isPeakHour === false ? ' (HC)' : ''}
                      </Text>
                      <Text style={styles.recapValue}>
                        {needsParticipants ? `${basePrice}€ × ${participants}` : `${basePrice}€`}
                      </Text>
                    </View>
                    {isAnniversaire && withAnimator && (
                      <View style={styles.recapRow}>
                        <Text style={styles.recapLabel}>🎤 Animateur ({selectedService?.id === 'anniversaire-all-star' ? '2h' : '1h'})</Text>
                        <Text style={styles.recapValue}>{animatorPrice}€</Text>
                      </View>
                    )}
                    {isMatchAmis && extraPlayers > 0 && (
                      <View style={styles.recapRow}>
                        <Text style={styles.recapLabel}>+{extraPlayers} joueur{extraPlayers > 1 ? 's' : ''} supp.</Text>
                        <Text style={styles.recapValue}>{extraCost}€</Text>
                      </View>
                    )}
                    <View style={[styles.recapRow, styles.recapTotal]}>
                      <Text style={styles.recapTotalLabel}>Total</Text>
                      <Text style={styles.recapTotalValue}>{totalPrice}€</Text>
                    </View>
                  </View>
                )}

                {/* Bouton réserver */}
                {(!NEEDS_SLOT.includes(selectedService?.type) || selectedSlot) && !(isPickup && pickupAvailability?.remaining === 0) && (
                  <TouchableOpacity style={styles.btnPrimary} onPress={handleBook} disabled={booking}>
                    {booking
                      ? <ActivityIndicator color={Colors.white} />
                      : <Text style={styles.btnPrimaryText}>Confirmer la réservation — {totalPrice}€</Text>
                    }
                  </TouchableOpacity>
                )}
              </>
            )}
            </>
            )} {/* fin else coaching */}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.secondary },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40, gap: 12 },

  // Barre de progression
  progressBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingTop: 56, paddingBottom: 8, backgroundColor: Colors.secondary },
  progressStep: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A2A3E', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  progressStepActive: { backgroundColor: Colors.primary },
  progressNum: { color: Colors.gray, fontWeight: '700', fontSize: 14 },
  progressNumActive: { color: Colors.white },
  progressLine: { flex: 1, height: 2, backgroundColor: '#2A2A3E', marginHorizontal: -4 },
  progressLineActive: { backgroundColor: Colors.primary },

  stepTitle: { color: Colors.white, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  backBtn: { marginBottom: 8 },
  backText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  // Service cards
  card: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: 'transparent' },
  cardSelected: { borderColor: Colors.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  cardArrow: { color: Colors.gray, fontSize: 18 },
  cardDesc: { color: Colors.gray, fontSize: 13, marginBottom: 12 },
  prices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priceTag: { backgroundColor: '#2A2A3E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  priceAmount: { color: Colors.primary, fontWeight: '800', fontSize: 15 },
  priceUnit: { color: Colors.primary, fontWeight: '600', fontSize: 11 },
  priceLabel: { color: Colors.gray, fontSize: 10 },

  // Calendrier
  calendar: { borderRadius: 16, overflow: 'hidden' },

  // Terrains & Créneaux
  venueBlock: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 16, gap: 12 },
  venueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  venueName: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  venueTypeBadge: { backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  venueTypeTxt: { color: Colors.primaryDark, fontWeight: '700', fontSize: 12 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: { backgroundColor: '#2A2A3E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: 'transparent' },
  slotBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  slotTime: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  slotTimeSelected: { color: Colors.primary },
  slotPeak: { color: Colors.gray, fontSize: 9, marginTop: 2, textAlign: 'center' },
  noSlots: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 24, alignItems: 'center' },
  noSlotsText: { color: Colors.gray, fontSize: 14, textAlign: 'center' },

  // Joueurs supplémentaires
  extraBox: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 16, gap: 12 },
  extraHeader: { gap: 2 },
  extraTitle: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  extraSubtitle: { color: Colors.gray, fontSize: 12 },
  extraMax: { color: Colors.gray, fontSize: 11, textAlign: 'center' },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  counterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  counterBtnDisabled: { backgroundColor: '#2A2A3E' },
  counterBtnText: { color: Colors.white, fontSize: 22, fontWeight: '700', lineHeight: 26 },
  counterMid: { alignItems: 'center', minWidth: 60 },
  counterValue: { color: Colors.white, fontSize: 28, fontWeight: '800' },
  counterSub: { color: Colors.gray, fontSize: 12, marginTop: -2 },

  // Récap
  recap: { backgroundColor: '#1E1E30', borderRadius: 12, padding: 16, gap: 8 },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between' },
  recapLabel: { color: Colors.gray, fontSize: 14 },
  recapValue: { color: Colors.white, fontSize: 14 },
  recapTotal: { borderTopWidth: 1, borderTopColor: '#2A2A3E', paddingTop: 8, marginTop: 4 },
  recapTotalLabel: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  recapTotalValue: { color: Colors.primary, fontWeight: '800', fontSize: 20 },

  // Pickup availability
  pickupAvail: { backgroundColor: '#1E3A1E', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.success },
  pickupAvailWarning: { backgroundColor: '#3A1E1E', borderColor: Colors.warning },
  pickupAvailLeft: { gap: 2 },
  pickupAvailTitle: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  pickupAvailSub: { color: Colors.gray, fontSize: 13 },
  pickupBar: { height: 6, backgroundColor: '#2A2A3E', borderRadius: 3, overflow: 'hidden' },
  pickupBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  fullBox: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 24, alignItems: 'center' },
  fullText: { color: Colors.gray, fontSize: 14, textAlign: 'center' },

  // Info box calendrier
  infoBox: { backgroundColor: '#1E1E30', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  infoBoxText: { color: Colors.gray, fontSize: 13 },

  // Animateur
  animatorBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E1E30', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: 'transparent' },
  animatorBoxActive: { borderColor: Colors.primary },
  animatorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  animatorEmoji: { fontSize: 28 },
  animatorTitle: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  animatorSubtitle: { color: Colors.gray, fontSize: 12, marginTop: 2 },
  animatorCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.gray, justifyContent: 'center', alignItems: 'center' },
  animatorCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  animatorCheckMark: { color: Colors.white, fontSize: 14, fontWeight: '800' },

  // Boutons
  btnPrimary: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  btnPrimaryText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnOutline: { borderWidth: 1.5, borderColor: Colors.gray, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  btnOutlineText: { color: Colors.white, fontSize: 15, fontWeight: '600' },

  // Succès
  successBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  successEmoji: { fontSize: 64 },
  successTitle: { color: Colors.white, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  successText: { color: Colors.gray, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Coaching pack — étape 3
  coachingPackBox: { gap: 12 },
  coachingPackCard: { backgroundColor: '#1E1E30', borderRadius: 20, padding: 24, alignItems: 'center', gap: 12, borderWidth: 2, borderColor: Colors.primary },
  coachingPackEmoji: { fontSize: 48 },
  coachingPackTitle: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  coachingPackPrice: { color: Colors.primary, fontSize: 32, fontWeight: '900' },
  coachingPackInfo: { width: '100%', gap: 10, marginTop: 8 },
  coachingPackLine: { color: Colors.gray, fontSize: 14, lineHeight: 20 },

  // Coaching — confirmation (étape 4)
  coachingConfirmCard: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 20, width: '100%', gap: 10 },
  coachingConfirmTitle: { color: Colors.primary, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  coachingConfirmText: { color: Colors.white, fontSize: 14, lineHeight: 20 },
  coachingSteps: { gap: 8, marginTop: 4 },
  coachingStep: { color: Colors.gray, fontSize: 13, lineHeight: 20 },
});
