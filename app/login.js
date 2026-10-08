                    <TextInput
                      value={phoneInput}
                      onChangeText={(value) =>
                        setPhoneInput(
                          value
                            .replace(/\D/g, '')
                            .slice(0, 11)
                        )
                      }
                      placeholder="09123456789"
                      placeholderTextColor="#9B9B9B"
                      style={styles.input}
                      keyboardType="phone-pad"
                      maxLength={11}
                      editable={!loading}
                      autoFocus
                    />
