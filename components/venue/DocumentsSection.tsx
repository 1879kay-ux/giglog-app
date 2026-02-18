import InfoCard from '@/components/InfoCard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

type DocumentsSectionProps = {
  eventId: string;
  setlistUrl?: string | null;
  eventinfoUrl?: string | null;
  promoMaterialUrl?: string | null;
  docOtherUrl?: string | null;
};

function normaliseUrl(raw?: string | null) {
  const v = (raw ?? '').trim();
  if (!v) return null;

  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;

  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function getDomain(url: string) {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

type DocItem = {
  key: 'setlist' | 'eventinfo' | 'promo' | 'other';
  label: string;
  url: string;
};

export default function DocumentsSection({
  eventId,
  setlistUrl,
  eventinfoUrl,
  promoMaterialUrl,
  docOtherUrl,
}: DocumentsSectionProps) {
  const router = useRouter();
  const goEdit = () => router.push(`/events/${eventId}/edit/documents`);

  const docs = useMemo<DocItem[]>(() => {
    const items: Array<{ key: DocItem['key']; label: string; url: string | null }> = [
      { key: 'setlist', label: 'Setlist', url: normaliseUrl(setlistUrl) },
      { key: 'eventinfo', label: 'Event Info', url: normaliseUrl(eventinfoUrl) },
      { key: 'promo', label: 'Promo Material', url: normaliseUrl(promoMaterialUrl) },
      { key: 'other', label: 'Other', url: normaliseUrl(docOtherUrl) },
    ];

    return items
      .filter((x): x is { key: DocItem['key']; label: string; url: string } => !!x.url)
      .map((x) => ({ key: x.key, label: x.label, url: x.url }));
  }, [setlistUrl, eventinfoUrl, promoMaterialUrl, docOtherUrl]);

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Can't open link", 'Check the URL format and try again.');
    }
  };

  const HeaderRight = (
    <Pressable onPress={goEdit} hitSlop={10} style={styles.headerBtn}>
      <Ionicons name="create-outline" size={18} color="#008080" />
      <Text style={styles.headerBtnText}>Edit</Text>
    </Pressable>
  );

  const isEmpty = docs.length === 0;

  return (
    <InfoCard title="Documents" right={HeaderRight}>
      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="documents-outline" size={22} color="#008080" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>No document links yet</Text>
            <Text style={styles.emptySub}>
              Add links for setlist, event info, promo material, or anything else.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {docs.map((d, idx) => {
            const last = idx === docs.length - 1;
            const domain = getDomain(d.url);

            return (
              <Pressable
                key={d.key}
                onPress={() => openUrl(d.url)}
                style={[styles.row, last && styles.rowLast]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.linkIcon}>
                    <Ionicons name="link-outline" size={16} color="#008080" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{d.label}</Text>
                    {!!domain && <Text style={styles.sub}>{domain}</Text>}
                  </View>
                </View>

                <Ionicons name="open-outline" size={18} color="#7a7a7a" />
              </Pressable>
            );
          })}
        </View>
      )}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E9F6F6',
  },
  headerBtnText: {
    color: '#008080',
    fontWeight: '800',
    fontSize: 13,
  },

  emptyWrap: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E9F6F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },
  emptySub: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
    lineHeight: 16,
  },

  list: {
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  linkIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F2FAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },
  sub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
