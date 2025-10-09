import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// IMPORTANT: Replace with your actual live Render.com URL
const API_BASE_URL = 'https://feedbackend-kqls.onrender.com';

// ## COMPONENT 1: UserView ##
// Moved outside the App component to prevent re-rendering on state change.
// It now receives all necessary data and functions as props.
const UserView = ({ searchTerm, setSearchTerm, officers, onSelectOfficer }) => {
  const renderOfficerItem = ({ item }) => (
    <TouchableOpacity onPress={() => onSelectOfficer(item)} style={styles.officerCard}>
      <View style={styles.officerInfo}>
        <Text style={styles.officerName}>{`${item.first_name} ${item.last_name}`}</Text>
        <Text style={styles.officerTitle}>{item.job_title}</Text>
      </View>
      <View style={styles.officerRating}>
        <Text style={styles.ratingText}>{item.avg_rating > 0 ? parseFloat(item.avg_rating).toFixed(1) : 'N/A'}</Text>
        <Icon name="star" size={16} color="#fbbf24" />
      </View>
      <Icon name="chevron-right" size={24} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by officer name..."
          placeholderTextColor="#9ca3af"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
      <FlatList
        data={officers}
        renderItem={renderOfficerItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </>
  );
};

// ## COMPONENT 2: FeedbackForm ##
// Moved outside to solve the keyboard dismissal issue in the comment box.
const FeedbackForm = ({ officer, feedback, setFeedback, submitting, onSubmit, onBack }) => (
  <ScrollView
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={{ paddingBottom: 20 }}
  >
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <Icon name="arrow-back" size={24} color="#2563eb" />
      <Text style={styles.backButtonText}>Back to List</Text>
    </TouchableOpacity>
    <View style={styles.formCard}>
      <Text style={styles.formOfficerName}>{`${officer.first_name} ${officer.last_name}`}</Text>
      <Text style={styles.formOfficerTitle}>{officer.job_title}</Text>

      <Text style={styles.label}>Rate your interaction</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setFeedback({ ...feedback, rating: star })}>
            <Icon name={feedback.rating >= star ? "star" : "star-border"} size={40} color={feedback.rating >= star ? "#fbbf24" : "#cbd5e1"} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Comments (optional)</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Describe your experience..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={4}
        value={feedback.comment}
        onChangeText={(text) => setFeedback({ ...feedback, comment: text })}
        textAlignVertical="top"
      />

      <TouchableOpacity
        onPress={onSubmit}
        disabled={submitting || feedback.rating === 0}
        style={[styles.submitButton, (submitting || feedback.rating === 0) && styles.submitButtonDisabled]}
      >
        <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit Feedback'}</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);

// ## COMPONENT 3: AdminView ##
// Moved outside for consistency and best practice.
const AdminView = ({ data }) => (
  <FlatList
    data={data.officers}
    keyExtractor={item => item.id.toString()}
    ListHeaderComponent={() => (
      <View style={styles.adminHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.total_feedback}</Text>
          <Text style={styles.statLabel}>Total Feedback</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{parseFloat(data.overall_average_rating).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Overall Avg. Rating</Text>
        </View>
      </View>
    )}
    renderItem={({ item }) => (
      <View style={styles.adminCard}>
        <View style={styles.adminOfficerInfo}>
          <Text style={styles.officerName}>{`${item.first_name} ${item.last_name}`}</Text>
          <View style={styles.officerRating}>
            <Text style={styles.ratingText}>{item.avg_rating > 0 ? parseFloat(item.avg_rating).toFixed(1) : 'N/A'}</Text>
            <Icon name="star" size={16} color="#fbbf24" />
            <Text style={styles.reviewCount}>({item.feedback_count} reviews)</Text>
          </View>
        </View>
        <View style={styles.feedbackList}>
          {item.feedback.length > 0 ? item.feedback.map(fb => (
            <View key={fb.id} style={styles.feedbackItem}>
              <View style={styles.officerRating}>
                {[...Array(5)].map((_, i) => <Icon key={i} name="star" size={16} color={i < fb.rating ? "#fbbf24" : "#e2e8f0"} />)}
              </View>
              <Text style={styles.feedbackText}>{fb.feedback_text || "No comment provided."}</Text>
              <Text style={styles.feedbackDate}>{new Date(fb.created_at).toLocaleDateString()}</Text>
            </View>
          )) : <Text style={styles.noFeedbackText}>No feedback for this officer yet.</Text>}
        </View>
      </View>
    )} />
);


// ## MAIN APP COMPONENT ##
const App = () => {
  const [currentView, setCurrentView] = useState('user'); // 'user' or 'admin'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User State
  const [officers, setOfficers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  // Admin State
  const [adminData, setAdminData] = useState({ officers: [], total_feedback: 0, overall_average_rating: 0 });

  const loadOfficers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/officers-with-ratings`);
      if (!response.ok) throw new Error('Failed to fetch officer data.');
      const data = await response.json();
      setOfficers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  const loadAdminData = async () => {
      if (adminData.officers.length > 0) return; // Don't reload if already loaded
      setLoading(true);
      setError(null);
      try {
          const response = await fetch(`${API_BASE_URL}/api/admin/all-feedback`);
          if (!response.ok) throw new Error('Failed to fetch admin data.');
          const data = await response.json();
          setAdminData(data);
      } catch(e) {
          setError(e.message);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    loadOfficers();
  }, []);
  
  // When an officer is de-selected, reset the feedback form state
  useEffect(() => {
    if (!selectedOfficer) {
      setFeedback({ rating: 0, comment: '' });
    }
  }, [selectedOfficer]);

  const submitFeedbackHandler = async () => {
    if (feedback.rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officer_id: selectedOfficer.id,
          rating: feedback.rating,
          feedback_text: feedback.comment,
          is_anonymous: 1,
        }),
      });
      if (!response.ok) throw new Error('Failed to submit feedback.');
      Alert.alert('Success', 'Thank you! Your feedback has been submitted.');
      setSelectedOfficer(null);
      loadOfficers(); // Refresh data
    } catch (e) {
      setError(e.message);
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  const filteredOfficers = useMemo(() => {
    if (!searchTerm) return officers;
    return officers.filter(officer =>
      `${officer.first_name} ${officer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [officers, searchTerm]);


  const renderHeader = () => (
    <View style={styles.header}>
      <Icon name="security" size={40} color="#93c5fd" />
      <View>
        <Text style={styles.headerTitle}>Cedar Rapids PD</Text>
        <Text style={styles.headerSubtitle}>Community Feedback Portal</Text>
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}}/>;
    }
    if (error) {
      return <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>;
    }
    if (currentView === 'user') {
      return selectedOfficer ? (
        <FeedbackForm
          officer={selectedOfficer}
          feedback={feedback}
          setFeedback={setFeedback}
          submitting={submitting}
          onSubmit={submitFeedbackHandler}
          onBack={() => setSelectedOfficer(null)}
        />
      ) : (
        <UserView
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          officers={filteredOfficers}
          onSelectOfficer={setSelectedOfficer}
        />
      );
    }
    return <AdminView data={adminData} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      {renderHeader()}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          onPress={() => setCurrentView('user')}
          style={[styles.toggleButton, currentView === 'user' && styles.toggleButtonActive]}
        >
          <Text style={[styles.toggleText, currentView === 'user' && styles.toggleTextActive]}>User View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setCurrentView('admin'); loadAdminData(); }}
          style={[styles.toggleButton, currentView === 'admin' && styles.toggleButtonActive]}
        >
          <Text style={[styles.toggleText, currentView === 'admin' && styles.toggleTextActive]}>Admin View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e40af', padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginLeft: 16 },
  headerSubtitle: { fontSize: 14, color: '#a5b4fc', marginLeft: 16 },
  toggleContainer: { flexDirection: 'row', padding: 4, margin: 16, backgroundColor: '#e5e7eb', borderRadius: 8 },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 6 },
  toggleButtonActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
  toggleText: { textAlign: 'center', fontWeight: '600', color: '#4b5563' },
  toggleTextActive: { color: '#1e40af' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 12, marginBottom: 16, borderColor: '#e5e7eb', borderWidth: 1 },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: '#111827' },
  officerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12, borderColor: '#e5e7eb', borderWidth: 1 },
  officerInfo: { flex: 1 },
  officerName: { fontSize: 18, fontWeight: '600', color: '#111827' },
  officerTitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  officerRating: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 16, fontWeight: 'bold', color: '#4b5563', marginRight: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 16},
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#2563eb', marginLeft: 8 },
  formCard: { backgroundColor: 'white', padding: 24, borderRadius: 12, margin: 16 },
  formOfficerName: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#111827' },
  formOfficerTitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 12 },
  starsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  textArea: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db', borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 120, textAlignVertical: 'top', fontSize: 16, color: '#111827' },
  submitButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  submitButtonDisabled: { backgroundColor: '#9ca3af' },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  adminHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statBox: { backgroundColor: 'white', flex: 1, marginHorizontal: 8, padding: 16, borderRadius: 8, alignItems: 'center', borderColor: '#e5e7eb', borderWidth: 1 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1e40af' },
  statLabel: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  adminCard: { backgroundColor: 'white', borderRadius: 8, marginBottom: 16, padding: 16, borderColor: '#e5e7eb', borderWidth: 1 },
  adminOfficerInfo: { borderBottomColor: '#f3f4f6', borderBottomWidth: 1, paddingBottom: 12, marginBottom: 12 },
  reviewCount: { fontSize: 14, color: '#6b7280', marginLeft: 8 },
  feedbackList: {},
  feedbackItem: { borderBottomColor: '#f3f4f6', borderBottomWidth: 1, paddingVertical: 12 },
  feedbackText: { fontSize: 15, color: '#374151', fontStyle: 'italic', marginTop: 8 },
  feedbackDate: { fontSize: 12, color: '#9ca3af', marginTop: 8 },
  noFeedbackText: { fontStyle: 'italic', color: '#6b7280' },
});

export default App;