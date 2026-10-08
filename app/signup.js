                onChangeText={(value) =>
                  setPhone(
                    value
                      .replace(/\D/g, '')
                      .slice(0, 11)
                  )
                }
                keyboardType="phone-pad"
                editable={!loading}
                maxLength={11}
